import Announcement from '../models/Announcement.js';

// @desc    Get all active announcements (or all for admin)
// @route   GET /api/announcements
// @access  Public
export const getAnnouncements = async (req, res) => {
  try {
    const { all } = req.query;
    let query = { active: true };
    if (all === 'true') {
      query = {}; // Admins can see all
    }
    const announcements = await Announcement.find(query).sort({ createdAt: -1 });
    res.json(announcements);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a new announcement
// @route   POST /api/announcements
// @access  Private/Admin
export const createAnnouncement = async (req, res) => {
  try {
    const { title, content, category, active, imageUrl } = req.body;
    const name = req.user?.name || 'Admin';

    const announcement = await Announcement.create({
      title,
      content,
      category: category || 'General',
      active: active !== undefined ? active : true,
      imageUrl: imageUrl || '',
      createdBy: name
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('announcement-created', announcement);
    }

    res.status(201).json(announcement);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update an announcement
// @route   PUT /api/announcements/:id
// @access  Private/Admin
export const updateAnnouncement = async (req, res) => {
  try {
    const { title, content, category, active, imageUrl } = req.body;
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    if (title !== undefined) announcement.title = title;
    if (content !== undefined) announcement.content = content;
    if (category !== undefined) announcement.category = category;
    if (active !== undefined) announcement.active = active;
    if (imageUrl !== undefined) announcement.imageUrl = imageUrl;

    await announcement.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('announcement-updated', announcement);
    }

    res.json(announcement);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete an announcement
// @route   DELETE /api/announcements/:id
// @access  Private/Admin
export const deleteAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    const id = announcement._id.toString();
    await announcement.deleteOne();

    const io = req.app.get('io');
    if (io) {
      io.emit('announcement-deleted', id);
    }

    res.json({ message: 'Announcement deleted successfully', id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
