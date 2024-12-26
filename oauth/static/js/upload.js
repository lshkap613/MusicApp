const dropArea = document.getElementById('drop-area');
const fileInput = document.getElementById('music');
const uploadBtn = document.getElementById('upload-btn');

let droppedFiles = [];

// Prevent default drag behaviors
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
    document.body.addEventListener(eventName, preventDefaults, false);
});


// Highlight drop area when a file is dragged over it
['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, highlight, false);
});


['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, unhighlight, false);
});


// Handle dropped files
dropArea.addEventListener('drop', handleDrop, false);

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}


function highlight() {
    dropArea.classList.add('highlight');
}


function unhighlight() {
    dropArea.classList.remove('highlight');
}


function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    fileInput.files = files;

    // Add dropped files to the array
    droppedFiles.push(...files);

    // Display dropped file names
    displayDroppedFiles(droppedFiles);
}

function displayDroppedFiles(files) {
    const fileListContainer = document.getElementById('file-list');
    fileListContainer.innerHTML = '';

    files.forEach(file => {
        const fileName = document.createElement('div');
        fileName.textContent = file.name;
        fileListContainer.appendChild(fileName);
    });
}


// Open file dialog when drop area is clicked
dropArea.addEventListener('click', () => {
    fileInput.click();
});


fileInput.addEventListener('change', handleFileSelection);

function handleFileSelection() {
    droppedFiles.push(...fileInput.files); // Add selected files to the array
    displayDroppedFiles(droppedFiles);
}