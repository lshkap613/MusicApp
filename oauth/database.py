from pymongo import MongoClient

## credentials for connecting to database
client = MongoClient('mongodb://localhost:27017/')
db = client['MusicPlayer']
users_collection = db['users']

def user_exists(email):
    # Check if user exists in the database
    return users_collection.find_one({'email': email}) is not None

def insert_user(email):
    # Insert user with an empty list of strings
    users_collection.insert_one({'email': email, 'labels': [], 'playlists': []})


