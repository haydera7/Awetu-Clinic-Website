import Message from '../models/Message.js';
import User from '../models/User.js';
import Patient from '../models/Patient.js';

// @desc    Get chat messages between logged-in user and target user
// @route   GET /api/messages/:targetId
// @access  Private
export const getMessages = async (req, res) => {
  try {
    const myId = req.user._id.toString();
    const targetId = req.params.targetId;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: targetId },
        { senderId: targetId, receiverId: myId }
      ]
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Send a message
// @route   POST /api/messages
// @access  Private
export const sendMessage = async (req, res) => {
  try {
    const senderId = req.user._id.toString();
    const senderName = req.user.name;
    const senderRole = req.user.role;

    const { receiverId, message } = req.body;

    if (!receiverId || !message) {
      return res.status(400).json({ message: 'Receiver and message content are required' });
    }

    // Resolve receiver details
    let receiverName = '';
    let receiverRole = '';

    // Check if receiver is a receptionist (User)
    let rxUser = await User.findById(receiverId);
    if (rxUser) {
      receiverName = rxUser.name;
      receiverRole = rxUser.role;
    } else {
      // Check if receiver is a Patient
      let rxPatient = await Patient.findById(receiverId);
      if (rxPatient) {
        receiverName = rxPatient.name;
        receiverRole = 'Patient';
      }
    }

    if (!receiverName) {
      return res.status(404).json({ message: 'Receiver not found' });
    }

    const newMessage = await Message.create({
      senderId,
      senderName,
      senderRole,
      receiverId,
      receiverName,
      receiverRole,
      message
    });

    // Dispatch real-time event via socket
    const io = req.app.get('io');
    if (io) {
      // Emit to the receiver's private room
      io.to(receiverId).emit('receive-message', newMessage);
      // Emit back to sender so other active tabs of the same sender stay synced
      io.to(senderId).emit('message-sent-sync', newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get contacts list based on user role
// @route   GET /api/messages/contacts/list
// @access  Private
export const getContacts = async (req, res) => {
  try {
    const role = req.user.role;
    const myId = req.user._id.toString();

    let contacts = [];

    if (role === 'Patient') {
      // Patients chat with Receptionists
      const receptionists = await User.find({ role: 'Receptionist', status: 'Active' })
        .select('_id name role email avatarColor');
      
      contacts = receptionists.map(r => ({
        id: r._id.toString(),
        name: r.name,
        role: r.role,
        avatarColor: r.avatarColor || '#3b82f6',
        subtitle: 'Receptionist Desk'
      }));
    } else if (role === 'Receptionist') {
      // Receptionists can chat with all patients
      const patients = await Patient.find().sort({ name: 1 });
      contacts = patients.map(p => ({
        id: p._id.toString(),
        name: p.name,
        role: 'Patient',
        pid: p.pid,
        avatarColor: '#10b981',
        subtitle: p.pid
      }));
    }

    // Include unread message counts for each contact
    const listWithUnreads = await Promise.all(contacts.map(async (c) => {
      const unreadCount = await Message.countDocuments({
        senderId: c.id,
        receiverId: myId,
        isRead: false
      });

      // Get last message in the conversation
      const lastMsg = await Message.findOne({
        $or: [
          { senderId: myId, receiverId: c.id },
          { senderId: c.id, receiverId: myId }
        ]
      }).sort({ createdAt: -1 });

      return {
        ...c,
        unreadCount,
        lastMessage: lastMsg ? lastMsg.message : '',
        lastMessageTime: lastMsg ? lastMsg.createdAt : null
      };
    }));

    // Sort contacts by who sent the latest message
    listWithUnreads.sort((a, b) => {
      if (!a.lastMessageTime) return 1;
      if (!b.lastMessageTime) return -1;
      return new Date(b.lastMessageTime) - new Date(a.lastMessageTime);
    });

    res.json(listWithUnreads);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark messages as read
// @route   PUT /api/messages/:senderId/read
// @access  Private
export const markAsRead = async (req, res) => {
  try {
    const myId = req.user._id.toString();
    const senderId = req.params.senderId;

    await Message.updateMany(
      { senderId, receiverId: myId, isRead: false },
      { isRead: true }
    );

    // Notify sender that their messages were read
    const io = req.app.get('io');
    if (io) {
      io.to(senderId).emit('messages-read-ack', { readerId: myId });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
