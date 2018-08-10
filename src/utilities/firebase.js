import firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/firestore';

function init() {
    const config = {
        apiKey: 'AIzaSyAQ3J3pivlY_L1qZ9yysqrprq62XuuBGHE',
        authDomain: 'shiqingqi-27cab.firebaseapp.com',
        databaseURL: 'https://shiqingqi-27cab.firebaseio.com',
        projectId: 'shiqingqi-27cab',
        storageBucket: 'shiqingqi-27cab.appspot.com',
        messagingSenderId: '207610618557'
    };

    firebase.initializeApp(config);

    return firebase.firestore();
}

export default {
    init,
    firebase
};
