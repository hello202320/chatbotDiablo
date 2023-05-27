import './App.css';
import {useAuthState} from 'react-firebase-hooks/auth'
import {useCollection} from 'react-firebase-hooks/firestore'
import {collection, orderBy, limit, query, addDoc, serverTimestamp} from 'firebase/firestore';
import {db, auth} from './firebase'
import {useEffect, useRef, useState} from 'react'
import {GoogleAuthProvider, signInWithPopup, signOut} from 'firebase/auth';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane } from '@fortawesome/free-solid-svg-icons';
import { faSignOutAlt } from '@fortawesome/free-solid-svg-icons';
import { faGoogle } from '@fortawesome/free-brands-svg-icons';

const API_TOKEN = process.env.REACT_APP_API_TOKEN
let user_messages = "hello"
let bot_messages = "hello"
const conversation = {
  "past_user_inputs": [user_messages],
  "generated_responses": [bot_messages]
}
async function queryBot(data) {
	const response = await fetch(
		"https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium",
		{
			headers: { Authorization: "Bearer "+API_TOKEN },
			method: "POST",
			body: JSON.stringify(data),
		}
	);
	const result = await response.json();
	return result;
}

function App() {
  const [user] = useAuthState(auth)
  return (
  
      <div className="App">
        <section>
          {user ? <ChatRoom /> : <SignIn />}
        </section>
  
      </div>
  );
}

function SignIn() {

  const googleSignIn = () =>{
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth,provider);
  }

  const [headerText, setHeaderText] = useState('');
  const fullHeaderText = 'Chatbot Diablo'; 

  useEffect(() => {
    let currentIndex = 0;
    const typingTimer = setInterval(() => {
      setHeaderText(fullHeaderText.substring(0, currentIndex));
      currentIndex++;

      if (currentIndex > fullHeaderText.length) {
        clearInterval(typingTimer);
      }
    }, 100); 

    return () => {
      clearInterval(typingTimer); 
    };
  }, []);

  return (
    <>
    <div className='sign-in-page'>
      <div className='sign-in-header'>
        <h1>{headerText}</h1>
      </div>
      <div className="line"></div>
      <button className="sign-in" onClick={googleSignIn}> <FontAwesomeIcon icon={faGoogle} /> Sign in with Google</button>
    </div>

    </>
  )

}

function SignOut() {
  return auth.currentUser && (
    <button className="sign-out" onClick={() => auth.signOut()}><FontAwesomeIcon icon={faSignOutAlt}size="2x" /> Logout</button>
  )
}
function ChatRoom() {
  const [user] = useAuthState(auth)
  const messageRef = collection(db, "messages")
  const queryRef = query(messageRef, orderBy("createdAt", "asc"), limit(25))
  const [messages] = useCollection(queryRef, {idField:"id"})
  const [formValue, setFormValue] = useState('')
  const scrollTo = useRef(null)
  const textareaRef = useRef(null)

  async function sendMessage(e) {
    e.preventDefault();
    if (!formValue) return;
  
    conversation["past_user_inputs"].push(formValue);
  
    const response = await queryBot({
      "inputs": {
        "past_user_inputs": conversation["past_user_inputs"],
        "generated_responses": conversation["generated_responses"],
        "text": formValue
      },
      "parameters": {
        "top_k": 100,
        "top_p": 0.7,
        "temperature": 0.3
      }
    });
  
    const output = response.generated_text;
    conversation["generated_responses"].push(output);
  
    const payload = {
      userResponse: formValue,
      generatedResponses: output,
      createdAt: serverTimestamp(),
      uid:user.uid, 
      photoURL: user.photoURL
    };
  
    await addDoc(messageRef, payload);
    setFormValue('');
  }
  useEffect(() => {
    autoResize()
    scrollTo.current.scrollIntoView({behavior: "smooth", block: 'end'})
  }, [messages])

  function autoResize() {
    const textarea = textareaRef.current;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }

  function handleTextareaChange(e) {
    const inputValue = e.target.value;
    if (inputValue.length <= 250) {
      setFormValue(inputValue);
      autoResize();
    }
  }
  return (
    <div className="App">
      <div className='header'>
        <div className='header-title'>
          <h1>Chatbot Diablo</h1>
        </div>
        <div className='header-button'>
          <SignOut />
        </div>
      </div>
       <div className='container'>
          <div className="filler"></div>
          <div className='messages'>
            {messages && messages.docs.map(img => <Images key={img.id} image={img.data()}/>)}
            <div ref={scrollTo}></div>
          </div>
        </div>
        
        <div className='form-container'>
            <div className="textarea-wrapper">
              <form> 
                  <textarea
                    ref={textareaRef}
                    value={formValue}
                    onChange={handleTextareaChange}
                    placeholder='Send a message.'
                  />
                  <span className="character-count">
                    {formValue.length}/250
                  </span>
              </form>
            </div>
          <button className="btn btn-primary" onClick={sendMessage}>
              <div className="fonticon"><FontAwesomeIcon icon={faPaperPlane} size="2x" /></div>
          </button>
        
      </div>
    
  </div>
  );
}

function Images(props){

  
  if (!auth.currentUser) return
  const {userResponse,generatedResponses, photoURL, uid} = props.image
  const className = uid === auth.currentUser.uid ? "sent" : "recieved" 
  return(
    <div className='la'>

      <div className={className}>
        <div className={'message-content'}>
          <img src={photoURL} alt="User Photo"></img>
          <div className={'message-text'}>
            <p>{userResponse}</p>
          </div> 
        </div>
      </div>

      <div className={"recieved"}>
        <div className={'message-content'}>
          <img src={'logo192.png'} alt="User Photo"></img>
          <div className={'message-text'}>
            <p>{generatedResponses}</p>
          </div> 
        </div>
      </div>

    </div>
  )
}

export default App;
