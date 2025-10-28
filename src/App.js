import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { MainContainer, ChatContainer, MessageList, Message, MessageInput} from '@chatscope/chat-ui-kit-react';
import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

function App() 
{  
  const [messages, setMessages] = useState([]);
  const [documents, setDocuments] = useState([]); // Для списка документов
  const [status, setStatus] = useState(''); // Для отчета генерации
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api'; // Гибко: из .env
  const [input, setInput] = useState('');

  const sendMessage = async () => 
  {    
      if (!input.trim()) return;
      const userMessage = { message: input, sentTime: new Date().toISOString(), direction: 'outgoing', sender: 'user' };
      setMessages([...messages, userMessage]);
      try {      
        const response = await axios.post(API_URL, { query: input }, {        headers: { 'Content-Type': 'application/json' }      });      
        const botMessage = { message: response.data.answer || 'Нет ответа от API', sentTime: new Date().toISOString(), direction: 'incoming', sender: 'bot' };
        setMessages(prev => [...prev, botMessage]);
      } catch (error) {      console.error('API error:', error);
        const errorMessage = { message: 'Ошибка API: ' + error.message, sentTime: new Date().toISOString(), direction: 'incoming', sender: 'bot' };
        setMessages(prev => [...prev, errorMessage]);
      }    setInput('');  
  };

  const handlePromptSubmit = async (prompt) => 
  {
    sendMessage(prompt);
    setMessages(prev => [...prev, { text: prompt, isUser: true }]); // Добавляем сообщение пользователя
    try {
      const response = await axios.post(`${API_URL}/search`, { prompt }); // Адаптируйте эндпоинт
      const result = response.data.result; // Предполагаем { result: 'Ответ от ИИ' }
      setMessages(prev => [...prev, { text: result, isUser: false }]);
    } catch (error) {
      setMessages(prev => [...prev, { text: 'Ошибка: ' + error.message, isUser: false }]);
    }
  };

  const [file, setFile] = useState(null);

  const handleFileChange = (e) => setFile(e.target.files[0]);

  const handleUpload = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append('document', file);
    try {
      await axios.post(`${API_URL}/upload`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      alert('Документ загружен');
      fetchDocuments(); // Обновим список (см. ниже)
    } catch (error) {
      alert('Ошибка: ' + error.message);
    }
  };

  const fetchDocuments = async () => {
  try {
    const response = await axios.get(`${API_URL}/documents`);
    setDocuments(response.data.documents); // Предполагаем [{ id: 1, name: 'doc.pdf' }]
  } catch (error) {
    setStatus('Ошибка: ' + error.message);
  }
  };
  
  //useEffect(() => { fetchDocuments(); }, []);

  const handleDelete = async (id) => {
  if (!window.confirm('Удалить?')) return;
  try {
    await axios.delete(`${API_URL}/documents/${id}`);
    fetchDocuments(); // Обновить список
  } catch (error) {
    alert('Ошибка: ' + error.message);
  }
  };

  const handleGenerate = async () => {
    try {
      await axios.post(`${API_URL}/generate`); // Запуск генерации
      setStatus('Генерация запущена');
      checkStatus(); // Начнём проверку отчета
    } catch (error) {
      setStatus('Ошибка: ' + error.message);
    }
  };

  const checkStatus = () => {
    const interval = setInterval(async () => {
      try {
        const response = await axios.get(`${API_URL}/status`);
        setStatus(response.data.status); // 'in progress', 'completed', etc.
        if (response.data.status === 'completed') clearInterval(interval);
      } catch (error) {
        setStatus('Ошибка: ' + error.message);
        clearInterval(interval);
      }
  }, 5000);

  };  
  return (  
      // <div className="container mt-3">      
      // <MainContainer>        
      //   <ChatContainer>          
      //     <MessageList>{messages.map((msg, i) => (<Message key={i} model={{message: msg.message,direction: msg.direction,sender: msg.sender, sentTime: msg.sentTime }}/>))}          
      //     </MessageList>          
      //     <MessageInput placeholder="Введите сообщение..."value={input}onChange={val => setInput(val)}onSend={sendMessage}attachButton={false}/>        
      //   </ChatContainer>      

      // </MainContainer>    </div> 
      // 
      <div className="container mt-4">
        <h1>AI Knowledge Base Web View</h1>
        <ChatContainer>
          <MessageList>{messages.map((msg, i) => (<Message key={i} model={{message: msg.message,direction: msg.direction,sender: msg.sender, sentTime: msg.sentTime }}/>))}          
          </MessageList>
          <MessageInput placeholder="Введите сообщение..." value={input}onChange={val => setInput(val)}  onSend={handlePromptSubmit} /> 
        </ChatContainer>
        {/* Разделы для других функций */}
        <div className="mt-4">
          <h2>Загрузить документ</h2>
          <input type="file" onChange={handleFileChange} className="form-control" />
          <button onClick={handleUpload} className="btn btn-primary mt-2">Отправить</button>
        </div>
        <div className="mt-4">
          <h2>Список документов</h2>
          <button onClick={fetchDocuments} className="btn btn-info mb-2">Обновить список</button>
          <table className="table">
            <thead><tr><th>ID</th><th>Имя</th><th>Действия</th></tr></thead>
            <tbody>
              {documents.map(doc => (
                <tr key={doc.id}>
                  <td>{doc.id}</td>
                  <td>{doc.name}</td>
                  <td><button onClick={() => handleDelete(doc.id)} className="btn btn-danger">Удалить</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4">
          <h2>Генерация базы</h2>
          <button onClick={handleGenerate} className="btn btn-success">Запустить генерацию</button>
          <p>Статус: {status}</p>
        </div>
      </div>  
    );
      
}
export default App;
