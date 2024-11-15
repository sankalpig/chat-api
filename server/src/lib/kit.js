
const fs = require('fs');
const path = require('path');
const moveFile = (sourcePath, destinationPath) => {
    const destinationFolder = path.dirname(destinationPath);
    // Ensure the source file has read and write permissions
    fs.chmodSync(sourcePath, 0o600); // Read and write permissions for the owner
    fs.chmodSync(destPath, 0o600);  // Read and write permissions for the owner


    if (!fs.existsSync(destinationFolder)) {
        fs.mkdirSync(destinationFolder, { recursive: true }, (err) => {

            if (err) {
                console.error('Error creating directory:', err);
                return;
            }
            // Move the file once the folder is created
            fs.rename(sourcePath, destinationPath, (err) => {
                if (err) {
                    console.error('Error moving the file:', err);
                } else {
                    console.log(`File moved successfully to ${destinationPath}`);
                }
            });
        });
    }

};

module.exports = { moveFile };