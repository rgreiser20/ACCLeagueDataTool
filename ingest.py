import os
import sys
import json
import time
import re
import logging
from datetime import datetime, date
from pathlib import Path
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv
from supabase import create_client, Client
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("acc_ingest")

# Read Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
WATCH_DIR = os.getenv("WATCH_DIR", "./results")
SEASON_ID_ENV = os.getenv("SEASON_ID")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    logger.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.")
    sys.exit(1)

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# Track processed files to avoid duplicate work on multiple modification events
# Maps absolute file path -> (file_size, modification_time)
PROCESSED_FILES: Dict[str, tuple] = {}


def parse_acc_date_from_filename(filename: str) -> str:
    """
    Extracts date from standard ACC results filename (e.g., '200622_211835_R.json').
    If filename doesn't match, returns today's date in YYYY-MM-DD format.
    """
    basename = os.path.basename(filename)
    match = re.match(r"^(\d{6})_(\d{6})_([PQRE])\.json$", basename, re.IGNORECASE)
    if match:
        date_str = match.group(1)  # e.g., '200622' (YYMMDD)
        try:
            parsed_date = datetime.strptime(date_str, "%y%m%d").date()
            return parsed_date.strftime("%Y-%m-%d")
        except ValueError:
            pass
    return date.today().strftime("%Y-%m-%d")


def read_acc_json_file(file_path: Path) -> Optional[Dict[str, Any]]:
    """
    Reads ACC result JSON files, which are typically encoded in UTF-16 LE (with BOM).
    Falls back to UTF-8 if UTF-16 fails.
    """
    try:
        # ACC server files are notoriously UTF-16 LE
        with open(file_path, "r", encoding="utf-16-le") as f:
            content = f.read()
            # If there's a byte order mark (BOM), it might cause issues, strip it if necessary
            if content.startswith('\ufeff'):
                content = content[1:]
            return json.loads(content)
    except (UnicodeError, UnicodeDecodeError):
        # Try UTF-8 fallback
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to read file {file_path} with UTF-8 fallback: {e}")
            return None
    except json.JSONDecodeError as e:
        logger.warning(f"Incomplete or malformed JSON in {file_path}: {e}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error reading {file_path}: {e}")
        return None


# Retry configuration for database calls (survive network hiccups)
@retry(
    stop=stop_after_attempt(5),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type(Exception),
    reraise=True
)
def get_or_create_active_season() -> str:
    """
    Resolves the active season UUID.
    If SEASON_ID is explicitly configured in .env, verifies and returns it.
    Otherwise queries for an active season. If none exists, creates a default active season.
    """
    if SEASON_ID_ENV:
        # Verify it exists
        res = supabase.table("seasons").select("id").eq("id", SEASON_ID_ENV).execute()
        if res.data:
            return res.data[0]["id"]
        logger.warning(f"Configured SEASON_ID {SEASON_ID_ENV} was not found. Falling back to active season check.")

    # Query active season
    res = supabase.table("seasons").select("id").eq("is_active", True).execute()
    if res.data:
        return res.data[0]["id"]

    # Fallback to any season
    res = supabase.table("seasons").select("id").execute()
    if res.data:
        return res.data[0]["id"]

    # Create default active season
    current_year = date.today().year
    insert_data = {
        "name": f"Season {current_year}",
        "year": current_year,
        "is_active": True
    }
    logger.info(f"No seasons found in database. Creating default active season: {insert_data['name']}")
    res = supabase.table("seasons").insert(insert_data).execute()
    if not res.data:
        raise RuntimeError("Failed to create default season in database.")
    return res.data[0]["id"]


@retry(
    stop=stop_after_attempt(5),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    reraise=True
)
def get_or_create_driver(first_name: str, last_name: str, steam_id: str, nationality_id: int) -> str:
    """
    Retrieves the driver UUID by steam_id.
    If they do not exist, inserts them and returns the new UUID.
    """
    # Clean steam_id
    steam_id_clean = steam_id.lstrip('S')
    
    # Query database
    res = supabase.table("drivers").select("id").eq("steam_id", steam_id_clean).execute()
    if res.data:
        return res.data[0]["id"]

    # Insert driver
    driver_data = {
        "first_name": first_name,
        "last_name": last_name,
        "steam_id": steam_id_clean,
        "nationality_id": nationality_id
    }
    logger.info(f"Driver not found. Creating driver: {first_name} {last_name} (Steam: {steam_id_clean})")
    res = supabase.table("drivers").insert(driver_data).execute()
    if not res.data:
        raise RuntimeError(f"Failed to create driver {first_name} {last_name}")
    return res.data[0]["id"]


@retry(
    stop=stop_after_attempt(5),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    reraise=True
)
def get_or_create_team(team_name: str) -> str:
    """
    Retrieves the team UUID by name.
    If the team does not exist, inserts it and returns the new UUID.
    """
    # Query database
    res = supabase.table("teams").select("id").eq("name", team_name).execute()
    if res.data:
        return res.data[0]["id"]

    # Insert team
    team_data = {
        "name": team_name
    }
    logger.info(f"Team not found. Creating team: {team_name}")
    res = supabase.table("teams").insert(team_data).execute()
    if not res.data:
        raise RuntimeError(f"Failed to create team {team_name}")
    return res.data[0]["id"]


@retry(
    stop=stop_after_attempt(5),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    reraise=True
)
def get_or_create_session(season_id: str, session_type: str, track_name: str, session_date: str) -> str:
    """
    Queries for an existing session with the same season_id, session_type, track_name, and session_date.
    If found, returns its UUID. If not, inserts it and returns the new UUID.
    """
    res = (
        supabase.table("sessions")
        .select("id")
        .eq("season_id", season_id)
        .eq("session_type", session_type)
        .eq("track_name", track_name)
        .eq("session_date", session_date)
        .execute()
    )
    if res.data:
        return res.data[0]["id"]

    # Insert session
    session_data = {
        "season_id": season_id,
        "session_type": session_type,
        "track_name": track_name,
        "session_date": session_date,
        "round_number": None  # Can be assigned/updated by admin later
    }
    logger.info(f"Session not found. Creating session: {session_type} @ {track_name} ({session_date})")
    res = supabase.table("sessions").insert(session_data).execute()
    if not res.data:
        raise RuntimeError(f"Failed to create session {session_type} @ {track_name}")
    return res.data[0]["id"]


@retry(
    stop=stop_after_attempt(5),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    reraise=True
)
def upsert_session_result(result_row: Dict[str, Any]) -> None:
    """
    Upserts a single driver result row into session_results.
    Uses on_conflict unique constraint of (session_id, driver_id).
    """
    supabase.table("session_results").upsert(result_row, on_conflict="session_id, driver_id").execute()


def process_file(file_path: Path) -> None:
    """
    Parses and processes an ACC result JSON file, resolving database records
    and inserting session results.
    """
    logger.info(f"Processing file: {file_path}")
    data = read_acc_json_file(file_path)
    if not data:
        # Could be partially written, ignore for now. If watchdog triggers again, we retry.
        return

    # 1. Resolve Session Type
    session_type_raw = data.get("sessionType")
    session_type_map = {
        "P": "Practice",
        "Q": "Qualifying",
        "R": "Race"
    }

    is_entrylist = False
    if session_type_raw in session_type_map:
        session_type = session_type_map[session_type_raw]
    elif "entries" in data:
        # File has 'entries' list - typically entrylist.json
        session_type = "Entrylist"
        is_entrylist = True
    else:
        logger.error(f"Unable to determine session type for {file_path}. Skipping.")
        return

    # 2. Resolve Track Name
    track_name = data.get("trackName", "Unknown")

    # 3. Resolve Session Date
    session_date = parse_acc_date_from_filename(str(file_path))

    try:
        # 4. Resolve active season
        season_id = get_or_create_active_season()

        # 5. Resolve Session
        session_id = get_or_create_session(season_id, session_type, track_name, session_date)
        
        # 6. Parse and Insert leaderboard / entries
        if is_entrylist:
            entries = data.get("entries", [])
            logger.info(f"Ingesting {len(entries)} entries for Entrylist session...")
            for entry in entries:
                car_model_id = entry.get("carModelType") or entry.get("forcedCarModel")
                team_name = entry.get("teamName") or f"Team Car {entry.get('raceNumber', '??')}"
                drivers_list = entry.get("drivers", [])

                team_id = get_or_create_team(team_name) if team_name else None

                for d in drivers_list:
                    first_name = d.get("firstName", "Unknown")
                    last_name = d.get("lastName", "Driver")
                    steam_id = d.get("playerId") or d.get("steamID")
                    if not steam_id:
                        continue
                    
                    nat_id = d.get("nationality", 0)
                    driver_id = get_or_create_driver(first_name, last_name, steam_id, nat_id)

                    result_row = {
                        "session_id": session_id,
                        "driver_id": driver_id,
                        "team_id": team_id,
                        "car_model_id": car_model_id,
                        "nationality_id": nat_id,
                        "laps_completed": 0,
                        "total_time_ms": None,
                        "best_lap_time_ms": None,
                        "is_fastest_lap": False,
                        "is_points_driver": True
                    }
                    upsert_session_result(result_row)
        else:
            # Result session
            result_root = data.get("sessionResult", {})
            leaderboard = result_root.get("leaderBoardLines", [])
            
            # Find the fastest lap of the session to set the is_fastest_lap flag
            valid_best_times = [
                line["timing"]["bestTime"]
                for line in leaderboard
                if "timing" in line and line["timing"].get("bestTime", 0) > 0 and line["timing"]["bestTime"] < 999999999
            ]
            min_best_time = min(valid_best_times) if valid_best_times else None

            logger.info(f"Ingesting {len(leaderboard)} leaderboard lines for {session_type}...")

            for idx, line in enumerate(leaderboard):
                car = line.get("car", {})
                car_model_id = car.get("carModelType")
                team_name = car.get("teamName")
                drivers_list = car.get("drivers", [])

                team_id = get_or_create_team(team_name) if team_name else None

                # Timing data
                timing = line.get("timing", {})
                laps_completed = timing.get("lapCount", 0)
                total_time_ms = timing.get("totalTime")
                best_lap_time_ms = timing.get("bestTime")
                
                # Handle total time of 0 or invalid gracefully (sometimes happens if driver DNS/DNF instantly)
                if total_time_ms == 0:
                    total_time_ms = None
                if best_lap_time_ms == 999999999:
                    best_lap_time_ms = None

                # Determine fastest lap
                is_fast_lap = False
                if min_best_time and best_lap_time_ms == min_best_time:
                    is_fast_lap = True

                # Process all drivers of this car
                for d in drivers_list:
                    first_name = d.get("firstName", "Unknown")
                    last_name = d.get("lastName", "Driver")
                    steam_id = d.get("playerId")
                    if not steam_id:
                        continue
                    
                    nat_id = d.get("nationality", 0)
                    driver_id = get_or_create_driver(first_name, last_name, steam_id, nat_id)

                    result_row = {
                        "session_id": session_id,
                        "driver_id": driver_id,
                        "team_id": team_id,
                        "car_model_id": car_model_id,
                        "nationality_id": nat_id,
                        "position_raw": idx + 1,  # Raw rank based on leaderboard position
                        "laps_completed": laps_completed,
                        "total_time_ms": total_time_ms,
                        "best_lap_time_ms": best_lap_time_ms,
                        "is_fastest_lap": is_fast_lap,
                        "is_points_driver": True
                    }
                    upsert_session_result(result_row)

        logger.info(f"Successfully ingested {file_path}")

    except Exception as e:
        logger.exception(f"Error processing session results for {file_path}: {e}")


class AccResultFileHandler(FileSystemEventHandler):
    """
    Watchdog event handler for monitoring directory changes.
    """
    def on_created(self, event):
        if not event.is_directory and event.src_path.endswith(".json"):
            self.handle_file_event(event.src_path)

    def on_modified(self, event):
        if not event.is_directory and event.src_path.endswith(".json"):
            self.handle_file_event(event.src_path)

    def handle_file_event(self, filepath: str):
        path = Path(filepath)
        if not path.exists():
            return

        # Get file stats
        try:
            stat = path.stat()
            current_size = stat.st_size
            current_mtime = stat.st_mtime
        except OSError:
            # File might be locked/inaccessible momentarily, skip
            return

        # Check if we already processed this exact version
        prev_stat = PROCESSED_FILES.get(filepath)
        if prev_stat == (current_size, current_mtime):
            return

        # Wait briefly to allow files to finish writing completely
        time.sleep(0.5)

        # Re-check file stats to make sure writing has finished
        try:
            stat = path.stat()
            if stat.st_size != current_size:
                # File is still growing, let the next modify event handle it
                return
        except OSError:
            return

        # Parse and process
        process_file(path)
        
        # Record as processed
        PROCESSED_FILES[filepath] = (stat.st_size, stat.st_mtime)


def main():
    logger.info("Starting ACC Telemetry Ingestion Daemon...")
    logger.info(f"Target Watch Directory: {os.path.abspath(WATCH_DIR)}")
    logger.info(f"Target Supabase URL: {SUPABASE_URL}")

    # Ensure watch directory exists
    os.makedirs(WATCH_DIR, exist_ok=True)

    # Process any files already in the directory at start
    logger.info("Checking for existing files in watch directory...")
    existing_files = list(Path(WATCH_DIR).glob("*.json"))
    if existing_files:
        logger.info(f"Found {len(existing_files)} existing files. Ingesting...")
        for filepath in existing_files:
            process_file(filepath)
            try:
                stat = filepath.stat()
                PROCESSED_FILES[str(filepath)] = (stat.st_size, stat.st_mtime)
            except OSError:
                pass

    # Initialize Watcher
    event_handler = AccResultFileHandler()
    observer = Observer()
    observer.schedule(event_handler, path=WATCH_DIR, recursive=False)
    observer.start()

    logger.info("Directory monitoring active. Press Ctrl+C to exit.")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        logger.info("Stopping observer...")
        observer.stop()
    observer.join()
    logger.info("Ingestion daemon stopped.")


if __name__ == "__main__":
    main()
