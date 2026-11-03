import os
import sys
from pathlib import Path

# Fix Windows console UTF-8 output
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

from huggingface_hub import HfApi, create_repo, upload_folder

def deploy():
    print("==================================================================")
    print("🚀 DEPLOYING SKYOBS STUDIO TO 24/7 CLOUD HOSTING (HUGGING FACE)")
    print("==================================================================")

    api = HfApi()
    user_info = api.whoami()
    username = user_info['name']
    repo_id = f"{username}/skyobs-studio"
    space_url = f"https://huggingface.co/spaces/{repo_id}"
    direct_app_url = f"https://{username.replace('_', '-')}-skyobs-studio.hf.space"

    print(f"\n[1/3] Authenticated as: {username}")
    print(f"      Target Space:   {repo_id}")

    # Check or create space
    try:
        api.repo_info(repo_id=repo_id, repo_type="space")
        print("[2/3] Found existing Space. Updating files...")
    except Exception:
        print("[2/3] Creating new 24/7 Docker Space on Hugging Face...")
        create_repo(
            repo_id=repo_id,
            repo_type="space",
            space_sdk="docker",
            private=False
        )

    # Prepare files to upload
    folder_path = Path(__file__).resolve().parent
    print(f"[3/3] Uploading SkyOBS Studio application from {folder_path}...")

    # Upload folder excluding large Windows binaries and pycache
    api.upload_folder(
        folder_path=str(folder_path),
        repo_id=repo_id,
        repo_type="space",
        ignore_patterns=["cloudflared.exe", "__pycache__/*", "*.pyc", "uploads/*"]
    )

    print("\n" + "=" * 68)
    print("🎉 DEPLOYMENT COMPLETE! YOUR 24/7 CLOUD STUDIO IS BUILDING & LIVE:")
    print("=" * 68)
    print(f"\n📱 Direct Fullscreen App URL (Open on Phones / Web):")
    print(f"   👉 {direct_app_url}\n")
    print(f"🖥️ Hugging Face Space Dashboard & Build Logs:")
    print(f"   👉 {space_url}\n")
    print("=" * 68)
    print("✨ Even when your laptop is completely powered off, this link will")
    print("   remain running 24/7 on the cloud for you and anyone else to use!")
    print("=" * 68 + "\n")

    return direct_app_url, space_url

if __name__ == "__main__":
    deploy()
