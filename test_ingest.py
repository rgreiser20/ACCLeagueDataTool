import os
import json
import unittest
from unittest.mock import MagicMock, patch
from pathlib import Path

# Set dummy environment variables before importing ingest
os.environ["SUPABASE_URL"] = "https://mock-supabase.co"
os.environ["SUPABASE_SERVICE_ROLE_KEY"] = "mock-key"
os.environ["WATCH_DIR"] = "./results"

from ingest import parse_acc_date_from_filename, read_acc_json_file, process_file

# Sample Mock ACC results (UTF-16 simulated)
MOCK_RACE_DATA = {
    "sessionType": "R",
    "trackName": "monza",
    "sessionIndex": 2,
    "sessionResult": {
        "isWetSession": 0,
        "leaderBoardLines": [
            {
                "car": {
                    "carId": 1001,
                    "raceNumber": 14,
                    "carModelType": 32,
                    "drivers": [
                        {
                            "firstName": "John",
                            "lastName": "Doe",
                            "playerId": "S76561198000000001",
                            "nationality": 1
                        }
                    ],
                    "teamName": "Scuderia Red"
                },
                "timing": {
                    "lapCount": 30,
                    "totalTime": 3600000,
                    "bestTime": 119500
                }
            },
            {
                "car": {
                    "carId": 1002,
                    "raceNumber": 88,
                    "carModelType": 30,
                    "drivers": [
                        {
                            "firstName": "Jane",
                            "lastName": "Smith",
                            "playerId": "76561198000000002",
                            "nationality": 2
                        }
                    ],
                    "teamName": "M4 Racing"
                },
                "timing": {
                    "lapCount": 29,
                    "totalTime": 3550000,
                    "bestTime": 120100
                }
            }
        ]
    }
}

MOCK_ENTRYLIST_DATA = {
    "entries": [
        {
            "carModelType": 32,
            "raceNumber": 14,
            "teamName": "Scuderia Red",
            "drivers": [
                {
                    "firstName": "John",
                    "lastName": "Doe",
                    "playerId": "S76561198000000001",
                    "nationality": 1
                }
            ]
        }
    ]
}


class TestAccIngest(unittest.TestCase):

    def test_parse_acc_date_from_filename(self):
        # Match pattern YYMMDD_HHMMSS_X.json
        d1 = parse_acc_date_from_filename("260622_211835_R.json")
        self.assertEqual(d1, "2026-06-22")

        d2 = parse_acc_date_from_filename("/path/to/200412_180000_P.json")
        self.assertEqual(d2, "2020-04-12")

        # Fallback date
        d3 = parse_acc_date_from_filename("invalid_name.json")
        self.assertRegex(d3, r"^\d{4}-\d{2}-\d{2}$")

    @patch("ingest.upsert_session_result")
    @patch("ingest.get_or_create_driver")
    @patch("ingest.get_or_create_team")
    @patch("ingest.get_or_create_session")
    @patch("ingest.get_or_create_active_season")
    def test_process_race_file(self, mock_season, mock_session, mock_team, mock_driver, mock_upsert):
        # Mock helper returns
        mock_season.return_value = "season-uuid-123"
        mock_session.return_value = "session-uuid-new"
        
        def team_side_effect(name):
            if name == "Scuderia Red":
                return "team-uuid-red"
            return "team-uuid-m4"
        mock_team.side_effect = team_side_effect

        def driver_side_effect(first, last, steam_id, nat_id):
            if steam_id == "S76561198000000001":
                return "driver-uuid-john"
            return "driver-uuid-jane"
        mock_driver.side_effect = driver_side_effect

        # Write mock race results JSON file
        file_path = Path("test_race.json")
        with open(file_path, "w", encoding="utf-16-le") as f:
            f.write(json.dumps(MOCK_RACE_DATA))

        try:
            # Process the mock file
            process_file(file_path)
            
            # Check upsert was called with the correct data
            upsert_calls = mock_upsert.call_args_list
            self.assertEqual(len(upsert_calls), 2)
            
            # P1 driver John Doe
            p1_call = upsert_calls[0][0][0]
            self.assertEqual(p1_call["session_id"], "session-uuid-new")
            self.assertEqual(p1_call["driver_id"], "driver-uuid-john")
            self.assertEqual(p1_call["team_id"], "team-uuid-red")
            self.assertEqual(p1_call["car_model_id"], 32)
            self.assertEqual(p1_call["nationality_id"], 1)
            self.assertEqual(p1_call["position_raw"], 1)
            self.assertEqual(p1_call["laps_completed"], 30)
            self.assertEqual(p1_call["total_time_ms"], 3600000)
            self.assertEqual(p1_call["best_lap_time_ms"], 119500)
            self.assertTrue(p1_call["is_fastest_lap"])

            # P2 driver Jane Smith
            p2_call = upsert_calls[1][0][0]
            self.assertEqual(p2_call["session_id"], "session-uuid-new")
            self.assertEqual(p2_call["driver_id"], "driver-uuid-jane")
            self.assertEqual(p2_call["team_id"], "team-uuid-m4")
            self.assertEqual(p2_call["car_model_id"], 30)
            self.assertEqual(p2_call["nationality_id"], 2)
            self.assertEqual(p2_call["position_raw"], 2)
            self.assertEqual(p2_call["laps_completed"], 29)
            self.assertEqual(p2_call["total_time_ms"], 3550000)
            self.assertEqual(p2_call["best_lap_time_ms"], 120100)
            self.assertFalse(p2_call["is_fastest_lap"])

        finally:
            if file_path.exists():
                file_path.unlink()

    @patch("ingest.upsert_session_result")
    @patch("ingest.get_or_create_driver")
    @patch("ingest.get_or_create_team")
    @patch("ingest.get_or_create_session")
    @patch("ingest.get_or_create_active_season")
    def test_process_entrylist_file(self, mock_season, mock_session, mock_team, mock_driver, mock_upsert):
        # Mock helper returns
        mock_season.return_value = "season-uuid-123"
        mock_session.return_value = "session-uuid-existing"
        mock_team.return_value = "team-uuid-red"
        mock_driver.return_value = "driver-uuid-john"

        # Write mock entrylist JSON file
        file_path = Path("entrylist.json")
        with open(file_path, "w", encoding="utf-16-le") as f:
            f.write(json.dumps(MOCK_ENTRYLIST_DATA))

        try:
            # Process entrylist file
            process_file(file_path)
            
            # Check upsert was called with the correct data
            upsert_calls = mock_upsert.call_args_list
            self.assertEqual(len(upsert_calls), 1)
            
            entry_call = upsert_calls[0][0][0]
            self.assertEqual(entry_call["session_id"], "session-uuid-existing")
            self.assertEqual(entry_call["driver_id"], "driver-uuid-john")
            self.assertEqual(entry_call["team_id"], "team-uuid-red")
            self.assertEqual(entry_call["car_model_id"], 32)
            self.assertEqual(entry_call["nationality_id"], 1)
            self.assertEqual(entry_call["laps_completed"], 0)
            self.assertIsNone(entry_call["total_time_ms"])
            self.assertIsNone(entry_call["best_lap_time_ms"])
            self.assertFalse(entry_call["is_fastest_lap"])

        finally:
            if file_path.exists():
                file_path.unlink()


if __name__ == "__main__":
    unittest.main()
