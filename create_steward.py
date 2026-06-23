import os
import sys
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

def main():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not url or not key:
        print("Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env file.")
        print("Please configure your .env file before running this script.")
        sys.exit(1)

    supabase: Client = create_client(url, key)

    print("--- Supabase Steward Auth Generator ---")
    email = input("Enter Steward Email: ").strip()
    password = input("Enter Steward Password (min 6 characters): ").strip()

    if len(password) < 6:
        print("Error: Password must be at least 6 characters.")
        sys.exit(1)

    try:
        print(f"Creating user '{email}' via admin API...")
        # create_user bypasses email confirmation using the service role key
        res = supabase.auth.admin.create_user({
            "email": email,
            "password": password,
            "email_confirm": True
        })
        
        if res.user:
            print("\n=========================================")
            print("  SUCCESS: Steward account registered!")
            print(f"  Email: {res.user.email}")
            print(f"  User ID: {res.user.id}")
            print("=========================================")
            print("You can now log into the Steward Portal on the Web App.")
        else:
            print("Failed to register user. No user data returned.")

    except Exception as e:
        print(f"\nError creating steward account: {e}")
        print("Make sure you are using the Service Role Key (not the anon key) in your .env file.")

if __name__ == "__main__":
    main()
