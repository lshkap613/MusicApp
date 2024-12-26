// Array to store labels
let labels = [];
let suggesions = [];


window.addEventListener('load', async function() {
    suggestions = await fetchUserLabels();
    handleInput({ target: document.getElementById('labelInput') });
    document.getElementById('labelInput').value="";

});


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


function handleInput(event) {
    const input = event.target.value.toLowerCase();

    // Filter suggestions based on user input
    const filteredSuggestions = suggestions.filter(suggestion =>
        suggestion.toLowerCase().startsWith(input)
    );

    filteredSuggestions.forEach(suggestion => {
        const option = document.createElement('option');
        option.value = suggestion;
        option.textContent = suggestion;
        labelInput.appendChild(option);
    });
}


// Handle key press event on the input field
function handleKeyPress(event) {
    if (event.key === 'Enter') {
        event.preventDefault(); // Prevent form submission
        const input = document.getElementById('labelInput');
        const label = input.value.trim();
        if (label !== '') {
            addLabel(label);
            console.log(labels);
            input.value = ''; // Clear input value after adding label
        }
    }
}


// Process the entire label list
function processLabels(file_id) {
    // in case label in input box but user didn't press enter before submitting
    const input = document.getElementById('labelInput');
        const label = input.value.trim();
        if (label !== '') {
            addLabel(label);
            input.value = ''; // Clear input value after adding label
        }

    // set label input box to all labels
    document.getElementById('labelsInput').value = JSON.stringify(labels); // Convert labels array to JSON string
}


