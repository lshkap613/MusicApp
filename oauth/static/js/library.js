// Add an event listener to the upload button
document.getElementById('upload').addEventListener('click', function() {
    // Redirect the user to a different page
    window.location.href = 'uploadForm'
});

// Add an event listener to the search button
document.getElementById('search-btn').addEventListener('click', function() {
    // Get the search query from the input field
    const searchQuery = document.getElementById('search-inpt').value;
    // Call the searchFiles function with the search query
    searchFiles(searchQuery);
});

// Add an event listener to the search input field to handle 'Enter' key press
document.getElementById('search-inpt').addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        // Get the search query from the input field
        const searchQuery = document.getElementById('search-inpt').value;
        // Call the searchFiles function with the search query
        searchFiles(searchQuery);
    }
});


function searchFiles(searchQuery) {
    // Make an AJAX request to the Flask route '/search' with the search query as a parameter
    fetch(`/search?query=${searchQuery}`)
        .then(response => response.json()) // Parse JSON response
        .then(searchResults => {
            // Update the content of the library section with the search results
            renderSearchResults(searchResults);
        })
        .catch(error => {
            console.error('Error performing search:', error);
        });
}

// Function to render search results
function renderSearchResults(searchResults) {
    const searchResultsDiv = document.getElementById('search-results');
    // Clear previous search results
    searchResultsDiv.innerHTML = '';

    const songsList = document.getElementById('songs');
    // Clear previous search results
    songsList.innerHTML = '';

    // If there are search results, render them
    if (searchResults.length > 0) {
        searchResults.forEach(file => {
            const listItem = document.createElement('li');
            listItem.classList.add('song');
            listItem.innerHTML = `
                <i class="fa-solid fa-circle-play fa-xl" onclick="playAudio('${file.id}')"></i>
                <span id="title${file.id}">${file.name}</span>
                <div class="dropdown-menu" id="dropdown-{{ file.id }}">
                    <button class = "edit" id="edit-{{ file.id }}" onclick="toggleDropdown('{{ file.id}}')">
                        <i class="fa fa-ellipsis-v" aria-hidden="true"></i>
                    </button>

                    <button class="tags" onclick="getLabels('{{ file.id }}')">
                        <i class="fa fa-tags" aria-hidden="true"></i></i>
                    </button>

                    <div class="dropdown-content" id="dropdown-content-{{ file.id }}">
                        <button onclick="renameFile('{{ file.id }}')">Rename</button>
                        <button onclick="editLabels('{{ file.id }}', '{{ file.name }}')">Edit Labels</button>
                        <button onclick="deleteFile('{{ file.id }}')">Delete</button>
                    </div>
                </div>
            `;
            songsList.appendChild(listItem);
        });
    } else {
        // If no search results found, display a message
        searchResultsDiv.textContent = 'No matching files found.';
    }
}



// Function to update the file list with search results
function updateFileList(searchResults) {
    // Get the file list container
    const fileList = document.getElementById('search-results');

    // Clear the current file list
    fileList.innerHTML = '';

    // Loop through the search results
    searchResults.forEach(file => {
        // Create a list item for each file
        const listItem = document.createElement('li');
        listItem.innerHTML = `
            <div class="result">${file.name}</div>
        `;
        
        // Append the list item to the file list container
        fileList.appendChild(listItem);
    });
}

let audio = new Audio(); // Create a new Audio object

function playAudio(fileId) {
    // If the audio is already playing and the same fileId is clicked, pause the audio
    if (!audio.paused && audio.dataset.fileId === fileId) {
        audio.pause();
        return;
    }
    
    fetch('/get-audio/' + fileId)
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to play audio');
        }
        // Set the source of the audio element
        return response.blob();
    })
    .then(blob => {
        // Convert the blob into a URL
        let objectURL = URL.createObjectURL(blob);
        // Set the source of the audio object
        audio.src = objectURL;
        audio.dataset.fileId = fileId;
        // Play the audio
        audio.play();
    })
    .catch(error => {
        console.error('Error playing audio:', error);
    });
}





// getLabels for files
function getLabels(fileId) {
    const labelsDiv = document.getElementById(`labels_${fileId}`);
    const labelsContent = labelsDiv.innerHTML; // Store current labels content
    if (labelsContent.trim() !== '') {
        labelsDiv.innerHTML = ''; // Clear labels content
    } else { // If labels are not displayed, fetch and display them
        fetch(`/getLabels/${fileId}`)
            .then(response => response.json())
            .then(data => {
                labelsDiv.innerHTML = ''; // Clear previous labels

                // Split the labels string into an array using commas as the delimiter
                const labelsArray = data.labels.split(',');

                labelsArray.forEach(label => {
                    const labelSpan = document.createElement('span');
                    labelSpan.textContent = label.trim(); // Remove leading/trailing whitespace
                    if (label) {
                        labelSpan.classList.add('label');
                    } else {
                        labelSpan.classList.add('noLabels');
                        labelsDiv.textContent = "No labels";
                    }
                    labelsDiv.appendChild(labelSpan);
                });
            })
            .catch(error => {
                console.error(`Error fetching labels for file ${fileId}:`, error);
            });
    }
}

// getLabels for files
function onlyShowLabels(fileId) {
    const labelsDiv = document.getElementById(`labels_${fileId}`);
    const labelsContent = labelsDiv.innerHTML; // Store current labels content
    if (labelsContent.trim() !== '') {
        labelsDiv.innerHTML = ''; // Clear labels content
    } else { // If labels are not displayed, fetch and display them
        fetch(`/getLabels/${fileId}`)
            .then(response => response.json())
            .then(data => {
                labelsDiv.innerHTML = ''; // Clear previous labels

                // Split the labels string into an array using commas as the delimiter
                const labelsArray = data.labels.split(',');

                labelsArray.forEach(label => {
                    const labelSpan = document.createElement('span');
                    labelSpan.textContent = label.trim(); // Remove leading/trailing whitespace
                    if (label) {
                        labelSpan.classList.add('label');
                    } 
                    labelsDiv.appendChild(labelSpan);
                });
            })
            .catch(error => {
                console.error(`Error fetching labels for file ${fileId}:`, error);
            });
    }
}

function labelView() {
    fetch('/get_file_ids')
        .then(response => response.json())
        .then(data => {
            console.log("hi");
            data.file_ids.forEach(fileId => {
                const labelsDiv = document.getElementById(`labels_${fileId}`);
                if (fileId) {
                    onlyShowLabels(fileId);
                }
            });
        })
        .catch(error => {
            console.error('Error fetching file IDs:', error);
        });
}


/* When the user clicks on a menu button,
toggle between hiding and showing the dropdown content */
function toggleDropdown(fileId) {
    // Close all dropdowns
    const allDropdowns = document.querySelectorAll('.dropdown-content');
    allDropdowns.forEach(dropdown => {
        if (dropdown.id !== `dropdown-content-${fileId}`) {
            dropdown.classList.remove('show');
        }
    });
    
    // Toggle the selected dropdown
    document.getElementById(`dropdown-content-${fileId}`).classList.toggle("show");
}



// Close the dropdown menu if the user clicks outside of it
window.onclick = function(event) {
    if (!event.target.matches('.edit')) {
        var dropdowns = document.getElementsByClassName("dropdown-content");
        var i;
        for (i = 0; i < dropdowns.length; i++) {
            var openDropdown = dropdowns[i];
            if (openDropdown.classList.contains('show')) {
                openDropdown.classList.remove('show');
            }
            }
        }
}


function editLabels(fileId, fileName) {
    fetch(`/categorize/${fileId}?file_name=${fileName}`)
    .then(response => {
        if (response.ok) {
            // If the response is successful, redirect the user to the categorize page
            window.location.href = response.url;
        } else {
            // Handle error if needed
            console.error('Error fetching categorize page:', response.status);
        }
    })
    .catch(error => {
        console.error('Error fetching categorize page:', error);
    });
}

function deleteFile(fileId) {
    fetch(`/deleteFile/${fileId}`, {
        method: 'GET'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
        // Reload the page after successful deletion
        location.reload();
        } else {
        console.error('Failed to delete file');
        }
    })
    .catch(error => {
        console.error('Error:', error);
});
}


function renameFile(fileId) {
    // Get the title element
    var titleElement = document.getElementById('title' + fileId);
    
    // Create an input field
    var inputField = document.createElement('input');
    inputField.type = 'text';
    inputField.value = titleElement.innerText;
    
    // Replace the title with the input field
    titleElement.parentNode.replaceChild(inputField, titleElement);
    
    // Focus the input field
    inputField.focus();
    
    // Add an event listener to save the new title when the user presses Enter
    inputField.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            saveTitle(fileId, inputField.value);
        }
    });
}


function saveTitle(fileId, newTitle) {
    // Send a request to the server to update the title
    fetch(`/renameFile/${fileId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ newTitle: newTitle })
    })
    .then(response => {
        if (response.ok) {
            // Reload the page after successful renaming
            location.reload();
        } else {
            console.error('Failed to rename file');
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
}
