import { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Send, 
  MessageSquare, 
  Check, 
  CheckCheck, 
  Calendar, 
  FileText, 
  Info,
  Clock
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { useTranslation } from '../../utils/translations';
import api from '../../services/api';
import './Messages.css';

export default function Messages() {
  const { user } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const role = user?.role || 'Patient';
  const preferredLanguage = user?.preferredLanguage || 'English';
  const { t } = useTranslation(preferredLanguage);

  const [contacts, setContacts] = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typedMessage, setTypedMessage] = useState('');
  const messagesEndRef = useRef(null);
  // Track message IDs that are already in state to prevent socket duplicates
  const seenMsgIds = useRef(new Set());

  // Fetch contacts list
  const fetchContacts = async () => {
    try {
      const res = await api.get('/messages/contacts/list');
      setContacts(res.data);
    } catch (err) {
      console.error('Failed to load contacts:', err);
    }
  };

  useEffect(() => {
    fetchContacts();
    // Poll contacts periodically to keep snippets up to date (fallback)
    const interval = setInterval(fetchContacts, 15000);
    return () => clearInterval(interval);
  }, []);

  // Fetch messages with active contact
  useEffect(() => {
    if (!activeContact) {
      setMessages([]);
      seenMsgIds.current = new Set();
      return;
    }

    const fetchMessages = async () => {
      try {
        const res = await api.get(`/messages/${activeContact.id}`);
        setMessages(res.data);
        // Seed the seen-set from the fetched history so socket events don't re-add them
        seenMsgIds.current = new Set(res.data.map(m => m._id));
        
        // Mark as read
        await api.put(`/messages/${activeContact.id}/read`);
        fetchContacts(); // Refresh counts
      } catch (err) {
        console.error('Failed to load messages:', err);
      }
    };

    fetchMessages();
  }, [activeContact]);

  // Scroll to bottom when messages list updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Helper to safely append a message only if not already in state
  const appendMessage = (msg) => {
    if (seenMsgIds.current.has(msg._id)) return; // already present — skip
    seenMsgIds.current.add(msg._id);
    setMessages(prev => [...prev, msg]);
  };

  // Socket event listeners for real-time chat updates
  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (msg) => {
      // If the message belongs to our active conversation
      if (activeContact && (msg.senderId === activeContact.id || msg.receiverId === activeContact.id)) {
        appendMessage(msg);
        // Auto mark as read
        api.put(`/messages/${msg.senderId}/read`).catch(console.error);
        // Ack back so sender gets checked ticks
        socket.emit('messages-read-ack', { readerId: user._id || user.id });
      } else {
        // Just reload contacts to show unread badges
        fetchContacts();
      }
    };

    const handleSentSync = (msg) => {
      // This event is emitted back to the SENDER so other open tabs stay in sync.
      // On the SAME tab the message was already added optimistically in handleSendMessage,
      // so we MUST deduplicate by _id to avoid the message vanishing due to duplicate React keys.
      if (activeContact && (msg.senderId === activeContact.id || msg.receiverId === activeContact.id)) {
        appendMessage(msg); // no-op if _id already seen
      }
      fetchContacts();
    };

    const handleReadAck = ({ readerId }) => {
      if (activeContact && readerId === activeContact.id) {
        setMessages(prev => prev.map(m => m.receiverId === readerId ? { ...m, isRead: true } : m));
      }
    };

    socket.on('receive-message', handleReceiveMessage);
    socket.on('message-sent-sync', handleSentSync);
    socket.on('messages-read-ack', handleReadAck);

    return () => {
      socket.off('receive-message', handleReceiveMessage);
      socket.off('message-sent-sync', handleSentSync);
      socket.off('messages-read-ack', handleReadAck);
    };
  }, [socket, activeContact]);

  const handleSendMessage = async (customText = null) => {
    const textToSend = customText || typedMessage;
    if (!textToSend.trim() || !activeContact) return;

    try {
      const res = await api.post('/messages', {
        receiverId: activeContact.id,
        message: textToSend.trim()
      });

      // Add the confirmed message via appendMessage so the seenMsgIds set is updated.
      // This prevents the incoming message-sent-sync socket event from adding a duplicate.
      appendMessage(res.data);
      if (!customText) setTypedMessage('');
      fetchContacts();
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Helper to check online status from onlineUsers list
  const isContactOnline = (contactId) => {
    return onlineUsers.some(online => online.userId === contactId);
  };

  // Search filter
  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (c.pid && c.pid.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Pre-filled shortcut templates for Patient
  const handleShortcutClick = (type) => {
    let messageText = '';
    if (type === 'appointment') {
      messageText = "Hello! I would like to request an appointment. Please let me know what dates and times are available this week. Thank you!";
    } else if (type === 'lab') {
      messageText = "Hello! I wanted to check if my recent lab test results are ready and uploaded. Thank you!";
    } else if (type === 'billing') {
      messageText = "Hello Reception Desk! I have a question regarding my clinic bill and online payments.";
    }
    setTypedMessage(messageText);
  };

  return (
    <div className="messages-container fade-in">
      {/* Sidebar Contacts List */}
      <div className="messages-sidebar">
        <div className="sidebar-chat-header">
          <h2>{role === 'Patient' ? t('messages') : 'Patient Desk Chat'}</h2>
          <div className="search-chat-wrap">
            <Search size={16} className="search-icon-chat" />
            <input 
              type="text" 
              placeholder={role === 'Patient' ? 'Search receptionists...' : 'Search patients by name or ID...'} 
              className="search-chat-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="contacts-scroll-area">
          {filteredContacts.length > 0 ? (
            filteredContacts.map(contact => {
              const online = isContactOnline(contact.id);
              const isSelected = activeContact?.id === contact.id;

              return (
                <div 
                  key={contact.id} 
                  className={`contact-item-card ${isSelected ? 'active' : ''}`}
                  onClick={() => setActiveContact(contact)}
                >
                  <div 
                    className="chat-avatar-wrapper" 
                    style={{ backgroundColor: contact.avatarColor || '#3b82f6' }}
                  >
                    {contact.name.charAt(0).toUpperCase()}
                    <span className={`chat-status-indicator ${online ? 'online' : ''}`}></span>
                  </div>

                  <div className="contact-info-block">
                    <div className="name-row">
                      <span className="contact-name">{contact.name}</span>
                      {contact.lastMessageTime && (
                        <span className="time-stamp">
                          {new Date(contact.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <div className="snippet-row">
                      <span className="snippet-text">
                        {contact.lastMessage || contact.subtitle || 'No messages yet'}
                      </span>
                      {contact.unreadCount > 0 && (
                        <span className="unread-badge-bubble">{contact.unreadCount}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--color-gray-400)', marginTop: '20px', fontSize: '0.9rem' }}>
              No contacts found.
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Display Window */}
      <div className="messages-main-view">
        {activeContact ? (
          <>
            {/* Active Header */}
            <div className="active-chat-header">
              <div className="header-user-card">
                <div 
                  className="chat-avatar-wrapper" 
                  style={{ backgroundColor: activeContact.avatarColor || '#3b82f6', width: '40px', height: '40px', fontSize: '0.95rem' }}
                >
                  {activeContact.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="header-name">{activeContact.name}</div>
                  <div className="header-role">
                    <span className={`active-presence-dot ${isContactOnline(activeContact.id) ? 'online' : ''}`}></span>
                    {activeContact.role === 'Patient' ? `Patient (ID: ${activeContact.pid})` : 'Reception Desk'}
                  </div>
                </div>
              </div>
            </div>

            {/* Message Area */}
            <div className="chat-messages-scroller">
              {messages.length > 0 ? (
                messages.map((msg) => {
                  const isOutgoing = msg.senderId === (user._id || user.id);
                  const formattedTime = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                  return (
                    <div key={msg._id} className={`chat-msg-row ${isOutgoing ? 'outgoing' : 'incoming'}`}>
                      <span className="bubble-meta-text">
                        {isOutgoing ? 'You' : msg.senderName} • {formattedTime}
                      </span>
                      <div className="chat-msg-bubble">
                        {msg.message}
                      </div>
                      {isOutgoing && (
                        <div className="bubble-footer-row">
                          {msg.isRead ? (
                            <CheckCheck size={14} style={{ color: 'var(--color-primary)' }} />
                          ) : (
                            <Check size={14} />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--color-gray-400)', gap: '8px' }}>
                  <MessageSquare size={36} style={{ strokeWidth: 1.5 }} />
                  <span>Start a secure real-time discussion.</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Action shortcuts (Only for patients to easily request appts/results) */}
            {role === 'Patient' && (
              <div className="chat-action-drawer">
                <button 
                  onClick={() => handleShortcutClick('appointment')} 
                  className="shortcut-pill-btn"
                >
                  <Calendar size={14} /> Request Appointment
                </button>
                <button 
                  onClick={() => handleShortcutClick('lab')} 
                  className="shortcut-pill-btn"
                >
                  <FileText size={14} /> Lab Inquiry
                </button>
                <button 
                  onClick={() => handleShortcutClick('billing')} 
                  className="shortcut-pill-btn"
                >
                  <Info size={14} /> Billing Help
                </button>
              </div>
            )}

            {/* Input Composer */}
            <div className="chat-input-composer">
              <input 
                type="text" 
                placeholder={role === 'Patient' ? 'Type your message to receptionist...' : 'Type response to patient...'} 
                className="composer-input-field"
                value={typedMessage}
                onChange={(e) => setTypedMessage(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button 
                onClick={() => handleSendMessage()} 
                className="composer-send-btn"
                disabled={!typedMessage.trim()}
              >
                <Send size={18} />
              </button>
            </div>
          </>
        ) : (
          /* Blank state landing screen */
          <div className="chat-landing-blank">
            <div className="landing-chat-icon-pulse">
              <MessageSquare size={36} />
            </div>
            <h3>{role === 'Patient' ? t('messages') : 'Real-time Message Desk'}</h3>
            <p>
              {role === 'Patient' 
                ? 'Select an active receptionist from the desk panel to request appointments or ask operational queries.' 
                : 'Select a patient from the sidebar list to view operational chats and coordinate details.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
