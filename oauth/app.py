import os
import io
import json
from flask import Flask, jsonify, request, render_template, redirect, url_for, send_file
import httplib2
from googleapiclient import discovery
from google.auth.transport import requests
from oauth2client import client
from oauth2client.file import Storage
from functools import wraps
from google_drive import get_files, download_file_from_drive, upload_file, set_label, get_labels, get_file_ids_by_label, get_file_names_by_label, delete_file, rename_file, delete_all_labels_from_file
import database as my_db 
from database import users_collection, user_exists, insert_user
from pydub import AudioSegment
from pydub.playback import play



app = Flask(__name__, static_folder='static')
##import uuid
##app.secret_key = str(uuid.uuid4())


@app.route('/oauth2callback')
def oauth2callback():
    try:
        flow = client.flow_from_clientsecrets(
            r'C:\Users\student\Documents\oauth\client_secret_685315715860-lma9u928lkhnq1793cb629fdsfv6gbrc.apps.googleusercontent.com.json',
            scope=['https://www.googleapis.com/auth/drive', 'openid', 'email', 'profile'],
            redirect_uri=url_for('oauth2callback', _external=True)
        )
        flow.params['include_granted_scopes'] = 'true'
        
        if 'code' not in request.args:
            auth_uri = flow.step1_get_authorize_url()
            return redirect(auth_uri)
        else:
            auth_code = request.args.get('code')
            credentials = flow.step2_exchange(auth_code)
            
            # Log the credentials to check their content
            app.logger.info('Credentials: %s', credentials.to_json())

            if not credentials.id_token:
                app.logger.error('ID token is None, credentials might not contain an ID token')
                return 'Authentication failed: no ID token received.', 400

            id_info = credentials.id_token

            user_email = id_info.get('email')
            if not user_email:
                app.logger.error('Email not found in ID token')
                return 'Authentication failed: email not found in ID token.', 400

            with open('credentials.json', 'w') as f:
                f.write(credentials.to_json())  # write access token to credentials.json locally

            # Check if user exists in the database
            if not user_exists(user_email):
                # If user does not exist, insert user with an empty list
                insert_user(user_email)

            return redirect(url_for('index'))
    except Exception as e:
        app.logger.error('An error occurred: %s', str(e))
        return str(e), 500



def get_credentials():
    credential_path = 'credentials.json'
    store = Storage(credential_path)
    credentials = store.get()
    if not credentials or credentials.invalid:
        print("Credentials not found.")
        return False
    else:
        print("Credentials fetched successfully.")
        return credentials


def get_drive_service():
    credentials = get_credentials()
    if not credentials:
        raise Exception("Credentials not found")

    http = credentials.authorize(httplib2.Http())
    service = discovery.build('drive', 'v3', http=http)
    return service


def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        credentials = get_credentials()
        if not credentials or credentials.access_token_expired:
            return redirect(url_for('oauth2callback', next=request.url))
        return f(*args, **kwargs)
    return decorated_function



@app.route('/')
def index():
    credentials = get_credentials()
    if not credentials:
        return redirect(url_for('oauth2callback'))
    elif credentials.access_token_expired:
        return redirect(url_for('oauth2callback'))
    else:
        audio_files = get_files(get_drive_service())
        name = credentials.id_token.get('name', 'Default Name')
        return render_template('library.html', files=audio_files, name=name) 


@app.route('/get_file_ids')
def get_file_ids():
    try:
        query = "mimeType='audio/mpeg' or mimeType='audio/wav'"
        drive_service = get_drive_service()
        results = drive_service.files().list(q=query, fields="files(id)").execute()
        file_ids = [file['id'] for file in results.get('files', [])]
        return jsonify(file_ids=file_ids)
    except Exception as e:
        return jsonify(error=str(e))
    

@app.route('/search')
def search_files():
    query = request.args.get('query')
    search_results = []
    drive_service = get_drive_service()
    files = get_files(drive_service)
    for file in files:
        if query.lower() in file['name'].lower():
            search_results.append(file)
    return jsonify(search_results)


@app.route('/getLabels/<file_id>', methods=['GET'])
def get_labels_route(file_id):
    drive_service = get_drive_service()
    labels = get_labels(drive_service, file_id)
    return jsonify({'labels': labels})



# upload new file form
@app.route('/uploadForm')
def upload_audio_form():
    credentials = get_credentials()
    if not credentials:
        return redirect(url_for('oauth2callback'))
    elif credentials.access_token_expired:
        return redirect(url_for('oauth2callback'))
    else:
        name = credentials.id_token['name']
    return render_template('upload.html', name=name)


# handle actual upload, redirect to categorize page
@app.route('/upload', methods=['POST'])
def handle_upload():
    if 'music' not in request.files:
        return jsonify({'error': 'No file part'})

    file = request.files['music']

    if file.filename == '':
        return jsonify({'error': 'No selected file'})

    if file:
        file_path = 'c:\\Users\\student\\Documents\\oauth\\temp\\' + file.filename
        file.save(file_path)

        drive_service = get_drive_service()
        file_info = upload_file(drive_service, file_path, file.filename)
        file_id=file_info['id']
    return redirect(url_for('categorize', file_id=file_id, file_name=file_info['name']))


# categorize page
@login_required
@app.route('/categorize/<file_id>', methods=['GET'])
def categorize(file_id):
    credentials = get_credentials()
    name = credentials.id_token['name']
    file_name = request.args.get('file_name')
    return render_template('categorize.html', file_id=file_id, file_name=file_name, name=name)


@app.route('/get_saved_labels', methods=['GET'])
def get_saved_labels():
    # Get the user's Google account email from the OAuth2 credentials
    credentials = get_credentials()
    if credentials is None:
        return jsonify({'error': 'Credentials not found'}), 404

    user_email = credentials.id_token['email']
    
    user = users_collection.find_one({'email': user_email})
    if user is None:
        return jsonify({'error': 'User not found'}), 404

    user_labels = user.get('labels', [])
    return jsonify({'labels': user_labels}), 200


## Add new unique labels to database
@app.route('/process_labels', methods=['POST'])
def process_labels():
    # Get the user's Google account email from the OAuth2 credentials
    credentials = get_credentials()
    if credentials is None:
        return jsonify({'error': 'Credentials not found'}), 404

    user_email = credentials.id_token['email']
    labels = [label.lower() for label in request.json.get('labels', [])]
    
    user = users_collection.find_one({'email': user_email})
    if user is None:
        return jsonify({'error': 'User not found'}), 404

    existing_labels = set(label.lower() for label in user.get('labels', []))

    # check if any labels that did not yet exist in database were added
    new_labels = [label for label in labels if label not in existing_labels]

    if new_labels:
        users_collection.update_one({'email': user_email}, {'$addToSet': {'labels': {'$each': new_labels}}})

    return jsonify({'message': 'Labels processed successfully'}), 200


# handles function to label the file
@app.route('/labelFile', methods=['POST'])
def label_file():
    file_id = request.form['file']
    labels_json = request.form['labels']
    labels = json.loads(labels_json)  
    try:
        drive_service = get_drive_service()
        delete_all_labels_from_file(drive_service, file_id)
        for label in labels:
            set_label(drive_service, file_id, label)
        return redirect(url_for('index'))
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})


# delete file route
@app.route('/deleteFile/<file_id>', methods=['GET'])
def delete(file_id):
    drive_service = get_drive_service()
    delete_file(drive_service, file_id)
    return jsonify({'success': True})


@app.route('/renameFile/<file_id>', methods=['POST'])
def rename_file_function(file_id):
    new_name = request.json['newTitle']
    drive_service = get_drive_service()
    rename_file(drive_service, file_id, new_name)
    return '', 200


def play_audio_from_google_drive(file_id):
    # Construct the direct download link
    download_link = f"https://drive.google.com/uc?id={file_id}"

    # Download the audio file
    response = requests.get(download_link)
    if response.status_code == 200:
        audio_data = response.content
    else:
        print("Failed to download audio file")
        return

    # Play the audio file
    audio = AudioSegment.from_file(io.BytesIO(audio_data))
    play(audio)


@app.route('/get-audio/<file_id>')
def play_audio(file_id):
    drive_service = get_drive_service()
    file_content = download_file_from_drive(drive_service, file_id)
    if file_content is not None:
        return send_file(
            io.BytesIO(file_content),
            mimetype='audio/mpeg'  # Set the appropriate MIME type for the audio file
        )
    else:
        return 'File download failed'
    

@login_required
@app.route('/create_playlist')
def createPlaylist_page():
    credentials = get_credentials()
    name = credentials.id_token['name']
    return render_template('create_playlist.html', name=name)


@app.route('/playlist', methods=['POST'])
def getPlayList():
    #get all songs with those labels
    labels_json = request.form['labels']
    labels = json.loads(labels_json)  # Convert JSON string back to Python list
    playlist_names = []
    playlist_ids = []
    try:
        for label in labels:
            print("label",label)
            drive_service = get_drive_service()
            playlist_names.extend(get_file_names_by_label(drive_service, label))
            playlist_ids.extend(get_file_ids_by_label(drive_service, label))
        # Convert to set to remove duplicates
        playlist_names = set(playlist_names)
        playlist_ids = set(playlist_ids)
        # Convert set back to list if necessary
        playlist_names = list(playlist_names)
        playlist_ids = list(playlist_ids)

        credentials = get_credentials()
        name = credentials.id_token['name']
        
        return render_template('player.html', playlist_names=playlist_names, playlist_ids=playlist_ids, name=name)
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})



@login_required
@app.route('/player', methods=['GET'])
def player():
    credentials = get_credentials()
    if not credentials:
        return redirect(url_for('oauth2callback'))
    elif credentials.access_token_expired:
        return redirect(url_for('oauth2callback'))
    else:
        name = credentials.id_token['name']
    
    # Get the playlist from query parameters
    playlist = request.args.get('playlist')
    if playlist:
        print("in py:", playlist)
        playlist = json.loads(playlist)  # Convert JSON string to a Python list
    else:
        playlist = []
    
    return render_template('player.html', playlist_ids=playlist, name=name, noSave=True)




@login_required
@app.route('/save-playlist', methods=['POST'])
def savePlaylist():
    credentials = get_credentials()
    if credentials is None:
        return jsonify({'error': 'Credentials not found'}), 404

    id_info = credentials.id_token
    user_email = id_info.get('email')
    name = credentials.id_token['name']

    playlist = request.json.get('playlist')
    playlist_name = request.json.get('playlist_name')
    print("Received playlist:", playlist)

    # Update the user's document in the database to include the new playlist
    users_collection.update_one(
        {'email': user_email},
        {'$addToSet': {'playlists': {'name': playlist_name, 'ids': playlist}}}
    )

    # Fetch the updated list of playlists from the database
    user = users_collection.find_one({'email': user_email}, {'_id': 0, 'playlists': 1})
    updated_playlists = user.get('playlists', [])
    
    return render_template('savedPlaylists.html', playlists=updated_playlists, name=name)



@login_required
@app.route('/savedPlaylists')
def savedPlaylists():
    credentials = get_credentials()
    if not credentials:
        return redirect(url_for('oauth2callback'))
    elif credentials.access_token_expired:
        return redirect(url_for('oauth2callback'))
    else:
        user_email = credentials.id_token.get('email')
        name = credentials.id_token['name']

    # Retrieve the user's playlists from the database
    user = users_collection.find_one({'email': user_email}, {'_id': 0, 'playlists': 1})
    playlists = user.get('playlists', [])

    return render_template('savedPlaylists.html', name=name, playlists=playlists)


@app.route('/logout')
def logout():
    credential_path = 'credentials.json'
    if os.path.exists(credential_path):
        os.remove(credential_path)
    return redirect(url_for('index'))


if __name__ == '__main__':
    if not os.path.exists(r'C:\Users\student\Documents\oauth\client_secret_685315715860-lma9u928lkhnq1793cb629fdsfv6gbrc.apps.googleusercontent.com.json'):
        print('Client secrets file (client_secret_685315715860-lma9u928lkhnq1793cb629fdsfv6gbrc.apps.googleusercontent.com.json) not found in the app path.')
        exit()
    import uuid
    app.secret_key = str(uuid.uuid4())
    app.run(debug=True)
