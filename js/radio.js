$('audio').mediaelementplayer({
    features: ['playpause', 'progress', 'current', 'tracks', 'fullscreen']
});

// Signs-in Friendly Chat.
function signIn() {
    // Sign into Firebase using popup auth & Google as the identity provider.
    var provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider);
}

// Signs-out of Friendly Chat.
function signOut() {
    // Sign out of Firebase.
    firebase.auth().signOut();
}

// Initiate Firebase Auth.
function initFirebaseAuth() {
    // Listen to auth state changes.
    firebase.auth().onAuthStateChanged(authStateObserver);
}

// Returns the signed-in user's profile pic URL.
function getProfilePicUrl() {
    return firebase.auth().currentUser.photoURL || 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQpdX6tPX96Zk00S47LcCYAdoFK8INeCElPeJrVDrh8phAGqUZP_g';
}

// Returns the signed-in user's display name.
function getUserName() {
    return firebase.auth().currentUser.displayName;
}

// Returns true if a user is signed-in.
function isUserSignedIn() {
    return !!firebase.auth().currentUser;
}

// Saves a new message to your Cloud Firestore database.
function saveMessage(messageText) {
    // Add a new message entry to the database.
    return firebase.firestore().collection('messages').add({
        name: getUserName(),
        text: messageText,
        profilePicUrl: getProfilePicUrl(),
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(function(error) {
        console.error('Error writing new message to database', error);
    });
}

// Loads chat messages history and listens for upcoming ones.
function loadMessages() {
    // Create the query to load the last 10 messages and listen for new ones.
    var query = firebase.firestore()
        .collection('messages')
        .orderBy('timestamp', 'desc')
        .limit(10);

    // Start listening to the query.
    query.onSnapshot(function(snapshot) {
        snapshot.docChanges().forEach(function(change) {
            if (change.type === 'removed') {
                deleteMessage(change.doc.id);
            } else {
                var message = change.doc.data();
                displayMessage(change.doc.id, message.timestamp, message.name,
                    message.text, message.profilePicUrl, message.imageUrl);
            }
        });
    });
}

// Triggered when the send new message form is submitted.
function onMessageFormSubmit(e) {
    e.preventDefault();
    // Check that the user entered a message and is signed in.
    if (messageInputElement.value && checkSignedInWithMessage()) {
        let message = messageInputElement.value;
        messageInputElement.value = "";
        saveMessage(message).then(function() {
            // Clear message text field and re-enable the SEND button.
            toggleButton();
        });
    }
}

// Triggers when the auth state change for instance when the user signs-in or signs-out.
function authStateObserver(user) {
    if (user) { // User is signed in!
        signOutButtonElement.removeAttribute('hidden');

        submitButtonElement.removeAttribute('hidden');

        messageInputElement.setAttribute('placeholder', 'Escribe un mensaje...');
        messageInputElement.removeAttribute('disabled');

        // Hide sign-in button.
        signInButtonElement.setAttribute('hidden', 'true');
    } else { // User is signed out!
        signOutButtonElement.setAttribute('hidden', 'true');

        submitButtonElement.setAttribute('hidden', 'true');

        messageInputElement.setAttribute('placeholder', 'Inicia sesion para enviar mensajes');
        messageInputElement.setAttribute('disabled', 'true');

        // Show sign-in button.
        signInButtonElement.removeAttribute('hidden');
    }
}

// Returns true if user is signed-in. Otherwise false and displays a message.
function checkSignedInWithMessage() {
    // Return true if the user is signed in Firebase
    if (isUserSignedIn()) {
        return true;
    }

    return false;
}


// Adds a size to Google Profile pics URLs.
function addSizeToGoogleProfilePic(url) {
    if (url.indexOf('googleusercontent.com') !== -1 && url.indexOf('?') === -1) {
        return url + '?sz=150';
    }
    return url;
}

// A loading image URL.
var LOADING_IMAGE_URL = 'https://www.google.com/images/spin-32.gif?a';

// Delete a Message from the UI.
function deleteMessage(id) {
    var div = document.getElementById(id);
    // If an element for that message exists we delete it.
    if (div) {
        div.parentNode.removeChild(div);
    }
}

// Template for messages.
var MESSAGE_TEMPLATE =
    '<div class="message">' +
    '<figure class="avatar">' +
    '<img class="pic" />' +
    '</figure>' +
    '<div class="name"></div>' +
    '<div class="message-text">' +
    '</div>' +
    '</div>'

function createAndInsertMessage(id, timestamp, className) {
    const container = document.createElement('div');
    container.innerHTML = MESSAGE_TEMPLATE;
    const div = container.firstChild;
    div.setAttribute('id', id);

    // If timestamp is null, assume we've gotten a brand new message.
    // https://stackoverflow.com/a/47781432/4816918
    timestamp = timestamp ? timestamp.toMillis() : Date.now();
    div.setAttribute('timestamp', timestamp);
    div.classList.add(className);

    // figure out where to insert new message
    const existingMessages = messageListElement.children;
    if (existingMessages.length === 0) {
        messageListElement.appendChild(div);
    } else {
        let messageListNode = existingMessages[0];

        while (messageListNode) {
            const messageListNodeTime = messageListNode.getAttribute('timestamp');

            if (!messageListNodeTime) {
                throw new Error(
                    `Child ${messageListNode.id} has no 'timestamp' attribute`
                );
            }

            if (messageListNodeTime > timestamp) {
                break;
            }

            messageListNode = messageListNode.nextSibling;
        }

        messageListElement.insertBefore(div, messageListNode);
    }

    return div;
}

// Displays a Message in the UI.
function displayMessage(id, timestamp, name, text, picUrl) {
    let className = "new";
    if (isUserSignedIn()) {
        className = getUserName() == name ? "message-personal" : "new";
    }
    var div = document.getElementById(id) || createAndInsertMessage(id, timestamp, className);

    // profile picture
    if (picUrl) {
        div.querySelector('.pic').setAttribute("src", addSizeToGoogleProfilePic(picUrl));
    }

    div.querySelector('.name').textContent = name + ": ";;
    var messageElement = div.querySelector('.message-text');

    if (text) { // If the message is text.
        messageElement.textContent = text;
        // Replace all line breaks by <br>.
        messageElement.innerHTML = messageElement.innerHTML.replace(/\n/g, '<br>');
    }
    // Show the card fading-in and scroll to view the new message.
    setTimeout(function() { div.classList.add('visible') }, 1);
    messageListElement.scrollTop = messageListElement.scrollHeight;
    messageInputElement.focus();
}

// Enables or disables the submit button depending on the values of the input
// fields.
function toggleButton() {
    if (messageInputElement.value) {
        submitButtonElement.removeAttribute('disabled');
    } else {
        submitButtonElement.setAttribute('disabled', 'true');
    }
}

// Checks that the Firebase SDK has been correctly setup and configured.
function checkSetup() {
    if (!window.firebase || !(firebase.app instanceof Function) || !firebase.app().options) {
        window.alert('You have not configured and imported the Firebase SDK. ' +
            'Make sure you go through the codelab setup instructions and make ' +
            'sure you are running the codelab using `firebase serve`');
    }
}

function radioError() {
    radioElement.innerHTML = '<h5>Volve el sabado a las 20:00hs</h5>';
    radioElement.removeAttribute('hidden');
}

function radioSuccess() {
    radioElement.removeAttribute('hidden');
}

// Shortcuts to DOM Elements.
var messageListElement = document.getElementById('messages-content');
var messageFormElement = document.getElementById('message-form');
var messageInputElement = document.getElementById('message');
var submitButtonElement = document.getElementById('submit');
var signInSnackbarElement = document.getElementById('must-signin-snackbar');
var signInButtonElement = document.getElementById('sign-in');
var signOutButtonElement = document.getElementById('sign-out');
var radioElement = document.getElementById('radio-player');

// Saves message on form submit.
messageFormElement.addEventListener('submit', onMessageFormSubmit);
signOutButtonElement.addEventListener('click', signOut);
signInButtonElement.addEventListener('click', signIn);

// Toggle for the button.
messageInputElement.addEventListener('keyup', toggleButton);
messageInputElement.addEventListener('change', toggleButton);

// Checks that Firebase has been imported.
checkSetup();

// initialize Firebase
initFirebaseAuth();

// We load currently existing chat messages and listen to new ones.
loadMessages();