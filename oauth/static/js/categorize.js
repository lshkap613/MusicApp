// Array to store labels
let labels = [];
let suggesions = [];


window.addEventListener('load', async function() {
    fetchCurrentLabels();
    suggestions = await fetchUserLabels();
});


function fetchCurrentLabels() {
    const fileId = document.getElementById('fileIdInput').value;

    // Make a GET request to fetch current labels from server
    fetch(`/getLabels/${fileId}`)
        .then(response => response.json())
        .then(data => {
            // Process the current labels and display them
            const labels = data.labels;
            console.log(labels)
            addLabelsToExistingList(labels);
        })
        .catch(error => {
            console.error('Error fetching current labels:', error);
        });
}

function addLabelsToExistingList(labels) {
    // Split the string of labels into an array
    const labelsArray = labels.split(',');

    // Add each label to the existing list
    labelsArray.forEach(label => {
        label = label.trim();
        if(label != ""){
            addLabel(label);
        }
    });
}


// Function to add label
function addLabel(label) {
    labels.push(label);
    updateLabelList();
}


function updateLabelList() {
    const labelList = document.getElementById('labelList');
    labelList.innerHTML = "";

    labels.forEach(label => {
        const listItem = document.createElement('div');
        listItem.classList.add('label-item');

        const labelContent = document.createElement('span');
        labelContent.textContent = label;
        listItem.appendChild(labelContent);

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'x';
        deleteButton.classList.add('delete-button');
        deleteButton.addEventListener('click', () => {
            deleteLabel(label);
        });
        listItem.appendChild(deleteButton);

        labelList.appendChild(listItem);
    });
}


function deleteLabel(label) {
    labels = labels.filter(item => item !== label);
    updateLabelList();
}

// Function to fetch user labels from the server
async function fetchUserLabels() {
    return fetch('/get_saved_labels')
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                console.error('Error fetching labels:', data.error);
                return [];
            }
            return data.labels;
        })
        .catch(error => {
            console.error('Error:', error);
            return [];
        });
}

const autocompleteList = document.getElementById('autocompleteList');

function handleInput(event) {
    const input = event.target.value.toLowerCase();
    autocompleteList.innerHTML = '';

    // Filter suggestions based on user input
    const filteredSuggestions = suggestions.filter(suggestion =>
        suggestion.toLowerCase().startsWith(input)
    );

    if (filteredSuggestions.length != 0) {
        autocompleteList.innerHTML = '<p id="suggested">Suggested:</p>';
    }

    // Display filtered suggestions
    filteredSuggestions.forEach(suggestion => {
        const suggestionItem = document.createElement('div');
        suggestionItem.classList.add('suggestion');
        suggestionItem.textContent = suggestion;
        suggestionItem.addEventListener('click', () => {
            // Set selected suggestion as input value
            document.getElementById('labelInput').value = suggestion;
            addLabel(suggestion);
            labelInput.value = '';
            // Clear autocomplete list
            autocompleteList.innerHTML = '';
        });
        autocompleteList.appendChild(suggestionItem);
    });
}

// Event listener for the input field
document.getElementById('labelInput').addEventListener('input', handleInput);

// Handle key press event on the input field
function handleKeyPress(event) {
    if (event.key === 'Enter') {
        event.preventDefault(); // Prevent form submission
        const input = document.getElementById('labelInput');
        const label = input.value.trim();
        if (label !== '') {
            addLabel(label);
            input.value = ''; // Clear input value after adding label
        }
    }
}


// Function to process and send labels to the Flask route
function processLabels(file_id) {
    const input = document.getElementById('labelInput');
    const label = input.value.trim();
    if (label !== '') {
        addLabel(label);
        input.value = '';
    }
    // set label input box to all labels
    document.getElementById('labelsInput').value = JSON.stringify(labels); // Convert labels array to JSON string
    //set fileId input box to file id
    document.getElementById('fileIdInput').value = file_id

    // Prepare data to send
    const data = {
        labels: labels,
        file_id: file_id
    };
    

    // Send data to Flask route via Fetch API
    fetch('/process_labels', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(result => {
        console.log('Success:', result);
        if (result.message) {
            console.log(result.message);
        } else if (result.error) {
            console.log('Error: ' + result.error);
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });

    labels = [];
}


