from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaIoBaseDownload, MediaFileUpload
import io
import os
from google_auth_oauthlib.flow import InstalledAppFlow
from pydub import AudioSegment
from pydub.playback import play


## Code for connecting to the google drive account
SCOPES = ['https://www.googleapis.com/auth/drive']
SERVICE_ACCOUNT_FILE = r'C:\Users\student\Documents\Practicum\crack-lamp-415900-ab2e3d4f3958.json'
AUDIO_FILE_FORMATS = ['mp3', 'wav']
TOKEN_FILE = 'token.json'
'''
def authenticate_google_drive():
    creds = service_account.Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE, scopes=SCOPES)
    drive_service = build('drive', 'v3', credentials=creds)
    return drive_service

def authenticate_google_drive():
    creds = None

    # Check if token file exists
    if os.path.exists(TOKEN_FILE):
        creds = service_account.Credentials.from_service_account_file(
            SERVICE_ACCOUNT_FILE, scopes=SCOPES)
    else:
        flow = InstalledAppFlow.from_client_secrets_file(
            'credentials.json', SCOPES)
        creds = flow.run_local_server(port=0)

        # Save the credentials for the next run
        with open(TOKEN_FILE, 'w') as token:
            token.write(creds.to_json())

    # Build the Drive service
    drive_service = build('drive', 'v3', credentials=creds)
    return drive_service
'''
def get_files(drive_service):
    query = "mimeType='audio/mpeg' or mimeType='audio/wav'"
    results = drive_service.files().list(
        pageSize=100,
        fields="nextPageToken, files(id, name)",
        q=query
    ).execute()
    files = results.get('files', [])
    return files


# List all files as name and id
def list_files_in_drive(drive_service):
    files = get_files(drive_service)

    if not files:
        print('No files found.')
        return None
    else:
        print('Files:')
        for file in files:
            print(u'{0} ({1})'.format(file['name'], file['id']))
        return files
        

def download_file_from_drive(drive_service, file_id):
    try:
        request = drive_service.files().get_media(fileId=file_id)
        file = io.BytesIO()
        downloader = MediaIoBaseDownload(file, request)
        done = False
        while done is False:
            status, done = downloader.next_chunk()
            print(f"Download {int(status.progress() * 100)}.")
    except HttpError as error:
        print(f"An error occurred: {error}")
        file = None
        
    return file.getvalue()



# rename file
def rename_file(drive_service, file_id, new_name):
    try:
        file_metadata = {'name': new_name}
        updated_file = drive_service.files().update(fileId=file_id, body=file_metadata).execute()
        return updated_file
    except HttpError as error:
        print(f"An error occurred: {error}")

        

# set a label to a file
def set_label(drive_service, file_id, label):
    try:
        # Retrieve existing labels for the file
        existing_labels = get_labels(drive_service, file_id)

        if existing_labels:
            # If labels already exist, append the new label to the list
            if label not in existing_labels:
                updated_labels = existing_labels + ',' + label
            else:
                updated_labels = existing_labels
        else:
            updated_labels = label

        # Set custom properties for the file
        body = {'properties': {'labels': updated_labels}}
        updated_file = drive_service.files().update(fileId=file_id, body=body).execute()
        print(f"Labels '{label}' set for file '{updated_file['name']}'.")
    except HttpError as error:
        print(f"An error occurred: {error}")



# get all labels of a specified file
def get_labels(drive_service, file_id):
    try:
        # Retrieve custom properties for the file
        file = drive_service.files().get(fileId=file_id, fields='properties').execute()
        properties = file.get('properties', {})
        labels = properties.get('labels', '')
        print(f"Labels for file '{file_id}': {labels}")
        return labels
    except HttpError as error:
        print(f"An error occurred: {error}")
        return None




def get_file_ids_and_names_by_label(drive_service, label):
    try:
        results = drive_service.files().list().execute()
        files = results.get('files', [])
        file_info = []
        for file in files:
            file_labels = get_labels(drive_service, file['id'])
            for file_label in file_labels.split(','):  # Split the labels string into a list
                print("l: ", label, " fl: ", file_label.lower())
                if (label == file_label.lower()):
                    file_info.append((file['id'], file['name']))
        return file_info    
    except HttpError as error:
        print(f"An error occurred: {error}")
        return None



def get_file_ids_by_label(drive_service, label):
    try:
        results = drive_service.files().list().execute()
        files = results.get('files', [])
        file_ids = []
        for file in files:
            if label in get_labels(drive_service, file['id']).lower():
                file_ids.append(file['id'])
        return file_ids    
    except HttpError as error:
        print(f"An error occurred: {error}")
        return None
    



def get_file_names_by_label(drive_service, label):
    try:
        results = drive_service.files().list().execute()
        files = results.get('files', [])
        file_names = []
        for file in files:
            if label in get_labels(drive_service, file['id']).lower():
                print("Label in: ", label)
                file_names.append(file['name'])
        return file_names    
    except HttpError as error:
        print(f"An error occurred: {error}")
        return None



# delete specified file
def delete_file(drive_service, file_id):
    try:
        drive_service.files().delete(fileId=file_id).execute()
        print(f"File with ID {file_id} has been deleted.")
    except HttpError as e:
        print(f"An error occurred: {e}")



# delete specified label from specified file
def delete_label(drive_service, file_id, label_to_delete):
    try:
        # Retrieve existing labels for the file
        existing_labels = get_labels(drive_service, file_id)

        if existing_labels:
            # Split the labels into a list
            label_list = existing_labels.split(',')

            if label_to_delete in label_list:
                # Remove the specified label from the list
                label_list.remove(label_to_delete)

                # Join the updated list back into a string
                updated_labels = ','.join(label_list)

                # Set custom properties for the file with updated labels
                body = {'properties': {'labels': updated_labels}}
                updated_file = drive_service.files().update(fileId=file_id, body=body).execute()
                print(f"Label '{label_to_delete}' deleted for file '{updated_file['name']}'.")
            else:
                print(f"Label '{label_to_delete}' not found in the labels for file '{file_id}'.")
        else:
            print(f"No labels found for file '{file_id}'.")
    except HttpError as error:
        print(f"An error occurred: {error}")



# clear all labels from a file
def delete_all_labels_from_file(drive_service, file_id):
    try:
        # Retrieve existing labels for the file
        existing_labels = get_labels(drive_service, file_id)

        if existing_labels:
            no_labels = None
            body = {'properties': {'labels': no_labels}}
            updated_file = drive_service.files().update(fileId=file_id, body=body).execute()
            print(f"All labels cleared from file '{updated_file['name']}'.")

    except HttpError as error:
        print(f"An error occurred: {error}")


# clear ALL labels from ALL files (dangerous function...)
def delete_labels_from_all_files(drive_service):
    try:
        files = drive_service.files().list().execute().get('files', [])
        
        for file in files:
            delete_all_labels_from_file(drive_service, file['id'])
    except HttpError as error:
        print(f"An error occurred: {error}")



# upload file to google drive
def upload_file(drive_service, file_path, file_name):
    file_metadata = {'name': file_name}
    media = MediaFileUpload(file_path, mimetype='audio/mpeg', resumable=True)
    file = (
        drive_service.files()
        .create(body=file_metadata,
                media_body=media,
                fields='id')
                .execute()
    )
    file_info = {'id': file.get("id"), 'name': file_name}
    return file_info