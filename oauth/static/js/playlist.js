let audioPlayer = document.getElementById("audioPlayer"); // Create a new Audio object
let playlist = [];
let index = 0;


// Function to play a specific song when its play button is clicked
function playAudio(fileId) {
    // If the audio is already playing and the same fileId is clicked, pause the audio
    if (!audioPlayer.paused && audioPlayer.dataset.fileId === fileId) {
        audioPlayer.pause();
        return;
    }

    fetchAudioAndPlay(fileId);
}

async function fetchAudioAndPlay(fileId) {
    try {
        const blob = await getSongBlob(fileId);
        const objectURL = URL.createObjectURL(blob);
        audioPlayer.src = objectURL;
        audioPlayer.dataset.fileId = fileId;
        audioPlayer.play();
    } catch (error) {
        console.error('Error playing audio:', error);
    }
}


async function fetchAudioAndLoad(fileId) {
    try {
        const blob = await getSongBlob(fileId);
        const objectURL = URL.createObjectURL(blob);
        audioPlayer.src = objectURL;
        audioPlayer.dataset.fileId = fileId;
        audioPlayer.load();
    } catch (error) {
        console.error('Error playing audio:', error);
    }
}

function getSongBlob(fileId) {
    return fetch('/get-audio/' + fileId)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to play audio');
            }
            return response.blob();
        })
        .catch(error => {
            throw new Error('Error fetching audio:', error);
        });
}



window.onload = function() {

    playlist = document.getElementById('playlist-data').getAttribute('playlist');
    // reformat string so can be parsed to json
    playlist = playlist.replace(/'/g, '"');
    console.log("p:" + playlist)
    playlist = JSON.parse(playlist);

    // Set initial source for audioPlayer
    if (playlist.length > 0) {
        fileId = playlist[0]
        fetchAudioAndLoad(fileId);
    }

    // Add event listener to handle end of song
    audioPlayer.addEventListener('ended', () => {
        index++; playNextSong(index)
    });

    // Add event listener to start playlist playback
    audioPlayer.addEventListener('play', handlePlayEvent);
};


function handlePlayEvent() {
    if (!audioPlayer.dataset.playlistStarted) {
        playNextSong(); // Start from the first song in the playlist
        audioPlayer.dataset.playlistStarted = 'true';
    }
}


async function playNextSong() {
    console.log(index);

    if (index >= playlist.length) {
        index = 0; // Loop back to the first song
    }

    try {
        fileId = playlist[index];
        const blob = await getSongBlob(fileId);
        const objectURL = URL.createObjectURL(blob);
        audioPlayer.src = objectURL;
        audioPlayer.dataset.currentIndex = index;
        audioPlayer.load(); // Ensure the audio element loads the new source
        audioPlayer.play();
    } catch (error) {
        console.error('Error playing next song:', error);
    }
}
