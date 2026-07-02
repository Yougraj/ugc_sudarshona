import os
import json
import subprocess
import sys

# Colors for terminal
PINK = "\033[95m"
CYAN = "\033[96m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
BOLD = "\033[1m"
END = "\033[0m"

def print_banner():
    print(f"\n{PINK}{BOLD}==================================================")
    print("      💖 ugc_sudarshona - UGC MANAGER 💖      ")
    print(f"=================================================={END}\n")

def get_input(prompt, default=None, required=False):
    suffix = f" (default: '{default}')" if default else (" *" if required else "")
    while True:
        val = input(f"{CYAN}{prompt}{suffix}: {END}").strip()
        if not val:
            if default is not None:
                return default
            if required:
                print(f"{RED}Error: This field is required!{END}")
                continue
            return ""
        return val

def run_db_helper(action, data=None):
    """Executes the db_helper.js Node script to interact with MongoDB"""
    cmd = ["node", "db_helper.js", action]
    if data:
        cmd.append(json.dumps(data))
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        print(f"{RED}Database helper command failed: {e.stderr.strip() or e.stdout.strip()}{END}")
        return None

def main():
    print_banner()
    
    print(f"{YELLOW}Connecting to MongoDB Atlas...{END}")
    count_res = run_db_helper("count")
    if count_res is None:
        print(f"{RED}Oh no! 🌸 We couldn't connect to MongoDB Atlas. Check your database settings and internet!{END}")
        sys.exit(1)
    
    db_count = 0
    found = False
    for line in count_res.splitlines():
        if line.startswith("db:"):
            try:
                db_count = int(line.split(":")[1])
                found = True
                break
            except ValueError:
                pass
    if not found:
        print(f"{RED}Failed to parse database count from output: {count_res}{END}")
        sys.exit(1)
        
    print(f"{GREEN}✔ Successfully connected to MongoDB Atlas! ({db_count} items found) 🌟{END}\n")

    while True:
        print(f"{PINK}{BOLD}--- Actions ---{END}")
        print("1. Add a New UGC Item")
        print("2. Remove/Delete a UGC Item")
        print("3. Exit")
        
        choice = input(f"\n{CYAN}Select an option (1-3): {END}").strip()
        
        if choice == '1':
            print(f"\n{PINK}{BOLD}--- Enter UGC Details ---{END}\n")
            
            productName = get_input("Product Name", default="Petal Glow Lip Oil")
            
            # Platform selection - only Instagram and YouTube
            while True:
                platform = get_input("Platform (instagram/youtube)", default="instagram").lower()
                if platform in ["instagram", "youtube"]:
                    break
                print(f"{RED}Invalid platform. Choose from: instagram, youtube{END}")
                
            username = "sudarshona gogoi"
            userHandle = "@ugc_sudarshona"
            content = get_input("Review Content / Caption", required=True)
            
            mediaUrl = get_input("Media URL (relative path, e.g. /ugc/petal_glow_1.jpg, or empty)", default="")
            mediaType = "text"
            if mediaUrl:
                while True:
                    mediaType = get_input("Media Type (image/video)", default="image").lower()
                    if mediaType in ["image", "video"]:
                        break
                    print(f"{RED}Invalid media type. Choose 'image' or 'video'{END}")
                    
            while True:
                try:
                    rating = int(get_input("Rating (1-5)", default="5"))
                    if 1 <= rating <= 5:
                        break
                    print(f"{RED}Rating must be between 1 and 5.{END}")
                except ValueError:
                    print(f"{RED}Please enter a valid number.{END}")
                    
            buyUrl = get_input("Direct Buy Product Link (e.g. https://example.com/buy)", required=True)
            
            # Post link (like on instagram / watch on youtube link)
            default_post_url = "https://www.instagram.com/ugc_sudarshona" if platform == "instagram" else "https://youtube.com"
            postUrl = get_input("Instagram Post or YouTube Video Link", default=default_post_url)
            
            tags_input = get_input("Tags (comma-separated, e.g. makeup, lipoil)")
            tags = [t.strip().lower() for t in tags_input.split(",") if t.strip()]
            
            new_item = {
                "productName": productName,
                "platform": platform,
                "username": username,
                "userHandle": userHandle,
                "content": content,
                "mediaUrl": mediaUrl,
                "mediaType": mediaType,
                "rating": rating,
                "buyUrl": buyUrl,
                "postUrl": postUrl,
                "tags": tags
            }
            
            print(f"\n{YELLOW}Saving item...{END}")
            insert_res = run_db_helper("insert", new_item)
            inserted_id = None
            if insert_res:
                for line in insert_res.splitlines():
                    if line.startswith("db-inserted:"):
                        inserted_id = line.split(":")[1].strip()
                        break
            if inserted_id:
                print(f"{GREEN}✔ Successfully saved! ID: {inserted_id}{END}\n")
            else:
                print(f"{RED}Failed to insert item. Output: {insert_res}{END}")
            
        elif choice == '2':
            print(f"{YELLOW}Fetching items list from MongoDB Atlas...{END}")
            list_res = run_db_helper("list")
            if not list_res:
                print(f"{RED}Failed to fetch items from database.{END}\n")
                continue
                
            items = None
            for line in list_res.splitlines():
                line_str = line.strip()
                if line_str.startswith("[") and line_str.endswith("]"):
                    try:
                        items = json.loads(line_str)
                        break
                    except Exception:
                        pass
            if items is None:
                try:
                    items = json.loads(list_res)
                except Exception as e:
                    print(f"{RED}Failed to parse items JSON: {e}{END}\n")
                    continue
                
            if not items:
                print(f"{YELLOW}No items available to delete! 🌸{END}\n")
                continue
                
            print(f"\n{PINK}{BOLD}--- Select UGC Item to Delete ---{END}\n")
            for idx, item in enumerate(items):
                content_snippet = item.get("content", "")
                if len(content_snippet) > 40:
                    content_snippet = content_snippet[:37] + "..."
                print(f"{idx + 1}. [{item.get('platform')}] {item.get('username')}: \"{content_snippet}\"")
                
            choice_del = get_input("\nEnter item number to delete (or 'c' to cancel)", default="c").strip().lower()
            if choice_del == 'c' or choice_del == 'cancel':
                print(f"{PINK}Cancelled deletion! Keep shining! ✨{END}\n")
                continue
                
            try:
                item_idx = int(choice_del) - 1
                if 0 <= item_idx < len(items):
                    target_item = items[item_idx]
                    target_id = target_item.get("_id")
                    
                    confirm = get_input(f"Are you sure you want to delete {target_item.get('username')}'s post? (y/n)", default="n").strip().lower()
                    if confirm == 'y' or confirm == 'yes':
                        print(f"{YELLOW}Deleting item...{END}")
                        del_res = run_db_helper("delete", target_id)
                        deleted_count = None
                        if del_res:
                            for line in del_res.splitlines():
                                if line.startswith("db-deleted:"):
                                    deleted_count = line.split(":")[1].strip()
                                    break
                        if deleted_count and int(deleted_count) > 0:
                            print(f"{GREEN}✔ Successfully deleted item from MongoDB Atlas! 🌸{END}\n")
                        else:
                            print(f"{RED}Failed to delete item. Output: {del_res}{END}\n")
                    else:
                        print(f"{PINK}Deletion cancelled! 💕{END}\n")
                else:
                    print(f"{RED}Invalid item number!{END}\n")
            except ValueError:
                print(f"{RED}Please enter a valid number.{END}\n")
                
        elif choice == '3':
            print(f"{PINK}Goodbye! Keep shining! ✨{END}")
            break
        else:
            print(f"{RED}Invalid option. Please try again.{END}\n")

if __name__ == "__main__":
    main()
