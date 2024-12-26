// Open the modal
function openModal() {
    const modal = document.getElementById("nameModal");
    modal.style.display = "block";
}

// Close the modal
function closeModal() {
    var modal = document.getElementById("nameModal");
    modal.style.display = "none";
}

// Save the playlist
function savePlaylist(playlist) {
    // Get the playlist data
    playlist = playlist.replace(/'/g, '"');
    const playlistName = document.getElementById('playlistName').value;

    // Check if the playlist name is provided
    if (!playlistName) {
        alert('Please enter a playlist name.');
        return;
    }

    // Optionally close the modal after saving
    closeModal();
    
    // Send the playlist data and name to the server
    fetch('/save-playlist', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ playlist_name: playlistName, playlist: JSON.parse(playlist) })
    })
    .then(response => response.json())
    .then(data => {
        console.log(data);
        
    })
    .catch(error => console.error('Error:', error));
}
