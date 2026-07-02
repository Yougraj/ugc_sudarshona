import os
import json
import sys
import datetime

# Check and import MongoDB dependencies
try:
    from pymongo import MongoClient
    from bson.objectid import ObjectId
except ImportError:
    print("\033[91mError: MongoDB Python dependencies are not installed!\033[0m")
    print("Please install them using:")
    print("  venv/bin/pip install pymongo dnspython")
    print("Or run the CLI with npm (which uses the virtual environment):")
    print("  npm run cli")
    sys.exit(1)

# Try imports for raw keyboard selection
try:
    import tty
    import termios
    import select
    IS_LINUX = True
except ImportError:
    IS_LINUX = False

# Colors for terminal
PINK = "\033[95m"
CYAN = "\033[96m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
BOLD = "\033[1m"
END = "\033[0m"

# Load local environment variables manually
def load_env_local():
    env_vars = {}
    if os.path.exists(".env.local"):
        with open(".env.local", "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#"):
                    if "=" in line:
                        k, v = line.split("=", 1)
                        k = k.strip()
                        v = v.strip()
                        if (v.startswith('"') and v.endswith('"')) or (v.startswith("'") and v.endswith("'")):
                            v = v[1:-1]
                        env_vars[k] = v
    return env_vars

# MongoDB configuration
ENV = load_env_local()
MONGODB_URI = ENV.get("MONGODB_URI") or os.environ.get("MONGODB_URI")
DB_NAME = "ugc_marketing"
COLLECTION_NAME = "ugc_items"

_mongo_client = None

def get_db_collection():
    global _mongo_client
    if not MONGODB_URI:
        print(f"{RED}Error: MONGODB_URI is not defined in .env.local or environment variables.{END}")
        sys.exit(1)
        
    if _mongo_client is None:
        try:
            _mongo_client = MongoClient(MONGODB_URI)
        except Exception as e:
            print(f"{RED}Failed to create MongoDB client: {e}{END}")
            sys.exit(1)
            
    return _mongo_client[DB_NAME][COLLECTION_NAME]

# Direct MongoDB Native Helpers
def db_count():
    try:
        col = get_db_collection()
        return col.count_documents({})
    except Exception as e:
        print(f"{RED}Oh no! 🌸 We couldn't connect to MongoDB Atlas. Error: {e}{END}")
        return None

def db_list():
    try:
        col = get_db_collection()
        docs = list(col.find({}).sort("createdAt", -1))
        items = []
        for doc in docs:
            item = dict(doc)
            item["_id"] = str(item["_id"])
            if "createdAt" in item and isinstance(item["createdAt"], datetime.datetime):
                item["createdAt"] = item["createdAt"].isoformat()
            items.append(item)
        return items
    except Exception as e:
        print(f"{RED}Failed to fetch items from database: {e}{END}")
        return None

def db_insert(new_item):
    try:
        col = get_db_collection()
        item_to_insert = dict(new_item)
        item_to_insert["createdAt"] = datetime.datetime.now(datetime.timezone.utc)
        item_to_insert["approved"] = True
        
        result = col.insert_one(item_to_insert)
        return str(result.inserted_id)
    except Exception as e:
        print(f"{RED}Failed to insert item: {e}{END}")
        return None

def db_delete(target_id):
    try:
        col = get_db_collection()
        query = {"_id": target_id}
        if ObjectId.is_valid(target_id):
            query = {"_id": {"$in": [target_id, ObjectId(target_id)]}}
            
        result = col.delete_one(query)
        return result.deleted_count
    except Exception as e:
        print(f"{RED}Failed to delete item: {e}{END}")
        return None

def db_update(target_id, updated_fields):
    try:
        col = get_db_collection()
        query = {"_id": target_id}
        if ObjectId.is_valid(target_id):
            query = {"_id": {"$in": [target_id, ObjectId(target_id)]}}
            
        fields_to_update = dict(updated_fields)
        if "_id" in fields_to_update:
            del fields_to_update["_id"]
            
        if "createdAt" in fields_to_update and isinstance(fields_to_update["createdAt"], str):
            try:
                iso_str = fields_to_update["createdAt"]
                if iso_str.endswith("Z"):
                    iso_str = iso_str[:-1] + "+00:00"
                fields_to_update["createdAt"] = datetime.datetime.fromisoformat(iso_str)
            except Exception:
                pass
                
        result = col.update_one(query, {"$set": fields_to_update})
        return result.modified_count
    except Exception as e:
        print(f"{RED}Failed to update item: {e}{END}")
        return None

class GoBackException(Exception):
    pass

def get_key():
    if not IS_LINUX:
        ch = sys.stdin.read(1)
        if not ch:
            raise EOFError("stdin closed")
        return ch
        
    fd = sys.stdin.fileno()
    old_settings = termios.tcgetattr(fd)
    try:
        tty.setraw(fd)
        ch_bytes = os.read(fd, 1)
        if not ch_bytes:
            raise EOFError("stdin closed")
        ch = ch_bytes.decode('utf-8', errors='ignore')
        
        if ch == '\x03':  # Ctrl+C
            raise KeyboardInterrupt
        if ch == '\x1b':  # Escape sequence
            # Non-blocking check for arrow key bytes remaining on raw file descriptor
            r, _, _ = select.select([fd], [], [], 0.05)
            if r:
                rest_bytes = os.read(fd, 2)
                seq = rest_bytes.decode('utf-8', errors='ignore')
                if seq in ['[A', 'OA']: return 'up'
                elif seq in ['[B', 'OB']: return 'down'
                elif seq in ['[C', 'OC']: return 'right'
                elif seq in ['[D', 'OD']: return 'left'
            return 'esc'
        return ch
    finally:
        termios.tcsetattr(fd, termios.TCSADRAIN, old_settings)

def fzf_select(items, format_fn, prompt="Search: ", header=None):
    if not items:
        return None
        
    query = ""
    selected_idx = 0
    prev_lines_count = 0
    
    # Hide cursor
    sys.stdout.write("\033[?25l")
    sys.stdout.flush()
    
    try:
        while True:
            # Filter
            filtered = []
            for item in items:
                display_str = format_fn(item)
                if all(word.lower() in display_str.lower() for word in query.split()):
                    filtered.append(item)
            
            # Clamp index
            if not filtered:
                selected_idx = 0
            else:
                selected_idx = max(0, min(selected_idx, len(filtered) - 1))
            
            # Clear previous lines
            if prev_lines_count > 0:
                for _ in range(prev_lines_count):
                    sys.stdout.write("\033[A\033[K")
                sys.stdout.flush()
                
            lines = []
            if header:
                lines.append(header)
            lines.append(f"{CYAN}{prompt}{BOLD}{query}{END}")
            
            # Limit results to 10
            max_results = 10
            display_slice = filtered[:max_results]
            
            for i, item in enumerate(display_slice):
                if i == selected_idx:
                    prefix = f"  {PINK}➔ 🌸{END} "
                    style = f"{BOLD}{GREEN}"
                else:
                    prefix = "     "
                    style = ""
                lines.append(f"{prefix}{style}{format_fn(item)}{END}")
                
            if len(filtered) > max_results:
                lines.append(f"  {YELLOW}... and {len(filtered) - max_results} more items (keep typing to filter) ...{END}")
            elif not filtered:
                lines.append(f"  {RED}No matching items found{END}")
                
            lines.append("")
            lines.append(f"{YELLOW}[Arrows: Navigate | Enter: Select | Esc: Back/Cancel]{END}")
            
            # Draw
            for line in lines:
                sys.stdout.write(line + "\n")
            sys.stdout.flush()
            prev_lines_count = len(lines)
            
            # Read key
            try:
                key = get_key()
            except (KeyboardInterrupt, EOFError):
                if prev_lines_count > 0:
                    for _ in range(prev_lines_count):
                        sys.stdout.write("\033[A\033[K")
                    sys.stdout.flush()
                raise
                
            if key == 'up':
                if filtered:
                    selected_idx = (selected_idx - 1) % len(filtered)
            elif key == 'down':
                if filtered:
                    selected_idx = (selected_idx + 1) % len(filtered)
            elif key == 'esc':
                if prev_lines_count > 0:
                    for _ in range(prev_lines_count):
                        sys.stdout.write("\033[A\033[K")
                    sys.stdout.flush()
                return None
            elif key == '\x7f' or key == '\x08':
                query = query[:-1]
                selected_idx = 0
            elif key == '\r' or key == '\n':
                if prev_lines_count > 0:
                    for _ in range(prev_lines_count):
                        sys.stdout.write("\033[A\033[K")
                    sys.stdout.flush()
                if filtered:
                    return filtered[selected_idx]
                return None
            elif len(key) == 1 and (key.isprintable() or key == ' '):
                query += key
                selected_idx = 0
    finally:
        # Restore cursor
        sys.stdout.write("\033[?25h")
        sys.stdout.flush()

def print_banner():
    print(f"\n{PINK}{BOLD}==================================================")
    print("      💖 ugc_sudarshona - UGC MANAGER 💖      ")
    print(f"=================================================={END}\n")

def get_input(prompt, default=None, required=False):
    suffix = f" (default: '{default}')" if default else (" *" if required else "")
    while True:
        try:
            val = input(f"{CYAN}{prompt}{suffix}: {END}").strip()
        except (KeyboardInterrupt, EOFError):
            raise GoBackException()
        if val.lower() in ['back', 'cancel']:
            raise GoBackException()
        if not val:
            if default is not None:
                return default
            if required:
                print(f"{RED}Error: This field is required!{END}")
                continue
            return ""
        return val

def fetch_items():
    return db_list()

def format_item_for_list(item):
    if item.get("_id") == "back":
        return f"{BOLD}{YELLOW}🔙 Go Back (Return to Main Menu){END}"
    platform = item.get("platform", "instagram")
    icon = "📸" if platform == "instagram" else "🎥"
    product = item.get("productName", "Unknown Product")
    creator = item.get("username", "sudarshona gogoi")
    content = item.get("content", "")
    content_snippet = content[:30] + "..." if len(content) > 30 else content
    
    # Calculate link counts
    buy_urls = item.get("buyUrls", [])
    total_links = len(buy_urls) + (1 if item.get("buyUrl") else 0)
    links_info = f"({total_links} link{'s' if total_links != 1 else ''})"
    
    return f"[{icon} {platform.upper()}] {product} {YELLOW}{links_info}{END} by {creator} - \"{content_snippet}\""

def show_detail_view(item):
    print(f"\n{PINK}{BOLD}==================================================")
    print(f"            🎀 UGC ITEM DETAIL VIEW 🎀")
    print(f"=================================================={END}")
    print(f"{CYAN}ID:{END}            {item.get('_id')}")
    print(f"{CYAN}Product Name:{END}  {BOLD}{item.get('productName')}{END}")
    
    platform = item.get('platform', '')
    platform_icon = "📸 Instagram" if platform == "instagram" else "🎥 YouTube"
    print(f"{CYAN}Platform:{END}      {platform_icon}")
    
    print(f"{CYAN}Creator:{END}       {item.get('username')} ({item.get('userHandle')})")
    
    rating = item.get('rating', 5)
    stars = "⭐" * rating
    print(f"{CYAN}Rating:{END}        {stars} ({rating}/5)")
    
    print(f"{CYAN}Post URL:{END}      {item.get('postUrl')}")
    print(f"{CYAN}Media URL:{END}     {item.get('mediaUrl')} ({item.get('mediaType')})")
    
    print(f"\n{CYAN}Primary Buy Link:{END} {item.get('buyUrl')}")
    
    buy_urls = item.get('buyUrls', [])
    if buy_urls:
        print(f"{CYAN}Alternative Buy Links:{END}")
        for idx, link in enumerate(buy_urls):
            print(f"  {idx + 1}. {BOLD}{link.get('name')}{END}: {link.get('url')}")
            
    tags = item.get('tags', [])
    if tags:
        print(f"{CYAN}Tags:{END}          {', '.join(tags)}")
        
    print(f"\n{CYAN}Review/Caption Content:{END}")
    print(f"{YELLOW}\"{item.get('content')}\"{END}")
    print(f"{PINK}{BOLD}=================================================={END}\n")
    
    try:
        input(f"{CYAN}Press Enter to return...{END}")
    except KeyboardInterrupt:
        pass

def edit_ugc_item(item):
    print(f"\n{PINK}{BOLD}--- Edit UGC Item Details ---{END}")
    print(f"{YELLOW}Press Enter to KEEP the current value, or type a new value.{END}\n")
    
    productName = get_input(f"Product Name (current: '{item.get('productName')}')", default=item.get('productName'))
    
    platform = item.get('platform', 'instagram')
    while True:
        plat_input = get_input(f"Platform (current: '{platform}', options: instagram/youtube)", default=platform).lower()
        if plat_input in ["instagram", "youtube"]:
            platform = plat_input
            break
        print(f"{RED}Invalid platform. Choose from: instagram, youtube{END}")
        
    content = get_input(f"Review Content / Caption", default=item.get('content'))
    
    mediaUrl = get_input(f"Media URL (current: '{item.get('mediaUrl')}')", default=item.get('mediaUrl'))
    mediaType = item.get('mediaType', 'text')
    if mediaUrl:
        while True:
            media_input = get_input(f"Media Type (current: '{mediaType}', options: image/video)", default=mediaType).lower()
            if media_input in ["image", "video"]:
                mediaType = media_input
                break
            print(f"{RED}Invalid media type. Choose 'image' or 'video'{END}")
    else:
        mediaType = "text"
        
    rating = item.get('rating', 5)
    while True:
        try:
            rating_input = get_input(f"Rating 1-5 (current: {rating})", default=str(rating))
            rating_val = int(rating_input)
            if 1 <= rating_val <= 5:
                rating = rating_val
                break
            print(f"{RED}Rating must be between 1 and 5.{END}")
        except ValueError:
            print(f"{RED}Please enter a valid number.{END}")
            
    postUrl = get_input(f"Post/Video Link (current: '{item.get('postUrl')}')", default=item.get('postUrl'))
    buyUrl = get_input(f"Primary Buy Link (current: '{item.get('buyUrl')}')", default=item.get('buyUrl'))
    
    buyUrls = item.get('buyUrls', [])
    print(f"\n{CYAN}Alternative Buy Links (currently {len(buyUrls)} links):{END}")
    for idx, link in enumerate(buyUrls):
        print(f"  {idx + 1}. {link.get('name')}: {link.get('url')}")
        
    print("\nActions for alternative buy links:")
    print("1. Keep existing alternative buy links")
    print("2. Edit/modify alternative buy links")
    print("3. Clear all alternative buy links")
    print("4. Add new alternative buy links")
    
    buy_choice = get_input("Select an option (1-4)", default="1")
    
    if buy_choice == '2':
        new_buy_urls = []
        for idx, link in enumerate(buy_urls):
            print(f"\n{YELLOW}Editing Link #{idx + 1}{END}")
            name = get_input(f"Store Name (current: '{link.get('name')}')", default=link.get('name'))
            url = get_input(f"Product Link (current: '{link.get('url')}')", default=link.get('url'))
            if name and url:
                new_buy_urls.append({"name": name, "url": url})
        buyUrls = new_buy_urls
    elif buy_choice == '3':
        buyUrls = []
        print(f"{YELLOW}Cleared all alternative buy links!{END}")
    elif buy_choice == '4':
        buyUrls = list(buyUrls)
        while True:
            name = get_input("Alternative Store Name (e.g. Amazon, Nykaa, Sephora) [or empty to stop]")
            if not name:
                break
            url = get_input(f"Alternative Product Link for {name}", required=True)
            buyUrls.append({"name": name, "url": url})
            
            another = get_input("Add another alternative buy link? (y/n)", default="n").lower()
            if another != 'y':
                break
                
    current_tags = ", ".join(item.get('tags', []))
    tags_input = get_input(f"Tags (comma-separated, current: '{current_tags}')", default=current_tags)
    tags = [t.strip().lower() for t in tags_input.split(",") if t.strip()]
    
    updated_item = {
        "productName": productName,
        "platform": platform,
        "username": item.get("username", "sudarshona gogoi"),
        "userHandle": item.get("userHandle", "@ugc_sudarshona"),
        "content": content,
        "mediaUrl": mediaUrl,
        "mediaType": mediaType,
        "rating": rating,
        "buyUrl": buyUrl,
        "buyUrls": buyUrls,
        "postUrl": postUrl,
        "tags": tags,
        "approved": item.get("approved", True)
    }
    
    print(f"\n{YELLOW}Updating item in database...{END}")
    updated_count = db_update(item.get("_id"), updated_item)
    if updated_count is not None and updated_count > 0:
        print(f"{GREEN}✔ Successfully updated UGC item in MongoDB Atlas! 🌸{END}\n")
    else:
        print(f"{RED}Failed to update item (or no fields were changed).{END}\n")

def main():
    print_banner()
    
    print(f"{YELLOW}Connecting to MongoDB Atlas...{END}")
    db_count_val = db_count()
    if db_count_val is None:
        sys.exit(1)
        
    print(f"{GREEN}✔ Successfully connected to MongoDB Atlas! ({db_count_val} items found) 🌟{END}\n")
    
    main_menu_options = [
        {"name": "✨ Add a New UGC Item", "action": "add"},
        {"name": "✏️  Edit an Existing UGC Item", "action": "edit"},
        {"name": "🗑️  Remove/Delete a UGC Item", "action": "delete"},
        {"name": "📊 View UGC Items / Data Properly", "action": "view"},
        {"name": "🚪 Exit", "action": "exit"}
    ]
    
    while True:
        try:
            choice_item = fzf_select(
                main_menu_options,
                lambda x: x["name"],
                prompt="Select an action: "
            )
            
            if not choice_item or choice_item["action"] == "exit":
                print(f"{PINK}Goodbye! Keep shining! ✨{END}")
                break
                
            action = choice_item["action"]
            
            try:
                if action == 'add':
                    print(f"\n{PINK}{BOLD}--- Enter UGC Details ---{END}\n")
                    productName = get_input("Product Name (or 'back' to cancel)", default="Petal Glow Lip Oil")
                    
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
                    
                    # Multiple alternative links
                    buyUrls = []
                    add_multi = get_input("Would you like to add alternative purchase options (e.g. Amazon, Nykaa)? (y/n)", default="n").lower()
                    if add_multi in ['y', 'yes']:
                        while True:
                            name = get_input("Alternative Store Name (e.g. Amazon, Nykaa, Sephora) [or empty to stop]")
                            if not name:
                                break
                            url = get_input(f"Alternative Product Link for {name}", required=True)
                            buyUrls.append({"name": name, "url": url})
                            
                            another = get_input("Add another alternative purchase option? (y/n)", default="n").lower()
                            if another not in ['y', 'yes']:
                                break
                    
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
                        "buyUrls": buyUrls,
                        "postUrl": postUrl,
                        "tags": tags
                    }
                    
                    print(f"\n{YELLOW}Saving item...{END}")
                    inserted_id = db_insert(new_item)
                    if inserted_id:
                        print(f"{GREEN}✔ Successfully saved! ID: {inserted_id}{END}\n")
                    else:
                        print(f"{RED}Failed to insert item.{END}")
                        
                elif action == 'edit':
                    print(f"{YELLOW}Fetching items list from MongoDB Atlas...{END}")
                    items = fetch_items()
                    if not items:
                        print(f"{RED}Failed to fetch items from database or no items exist.{END}\n")
                        continue
                        
                    items_with_back = list(items) + [{"_id": "back"}]
                    item_to_edit = fzf_select(
                        items_with_back,
                        format_item_for_list,
                        prompt="Select UGC Item to Edit: "
                    )
                    if not item_to_edit or item_to_edit.get("_id") == "back":
                        raise GoBackException()
                        
                    edit_ugc_item(item_to_edit)
                    
                elif action == 'delete':
                    print(f"{YELLOW}Fetching items list from MongoDB Atlas...{END}")
                    items = fetch_items()
                    if not items:
                        print(f"{RED}Failed to fetch items from database or no items exist.{END}\n")
                        continue
                        
                    items_with_back = list(items) + [{"_id": "back"}]
                    item_to_del = fzf_select(
                        items_with_back,
                        format_item_for_list,
                        prompt="Select UGC Item to Delete: "
                    )
                    if not item_to_del or item_to_del.get("_id") == "back":
                        raise GoBackException()
                        
                    confirm = get_input(f"Are you sure you want to delete {item_to_del.get('username')}'s review for '{item_to_del.get('productName')}'? (y/n)", default="n").strip().lower()
                    if confirm in ['y', 'yes']:
                        print(f"{YELLOW}Deleting item...{END}")
                        deleted_count = db_delete(item_to_del.get("_id"))
                        if deleted_count is not None and deleted_count > 0:
                            print(f"{GREEN}✔ Successfully deleted item from MongoDB Atlas! 🌸{END}\n")
                        else:
                            print(f"{RED}Failed to delete item.{END}\n")
                    else:
                        print(f"{PINK}Deletion cancelled! 💕{END}\n")
                        
                elif action == 'view':
                    print(f"{YELLOW}Fetching items list from MongoDB Atlas...{END}")
                    items = fetch_items()
                    if not items:
                        print(f"{RED}Failed to fetch items from database or no items exist.{END}\n")
                        continue
                        
                    while True:
                        items_with_back = list(items) + [{"_id": "back"}]
                        item_to_view = fzf_select(
                            items_with_back,
                            format_item_for_list,
                            prompt="Select UGC Item to View Details (Esc to go back): "
                        )
                        if not item_to_view or item_to_view.get("_id") == "back":
                            raise GoBackException()
                        show_detail_view(item_to_view)
                        
            except GoBackException:
                print(f"\n{PINK}Operation cancelled. Going back to main menu...{END}\n")
                continue
                
        except (KeyboardInterrupt, EOFError):
            print(f"\n{PINK}Goodbye! Keep shining! ✨{END}")
            break

if __name__ == "__main__":
    main()
