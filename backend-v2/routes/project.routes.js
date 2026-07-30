const express = require('express');
const router = express.Router();
const { Project, User } = require('../models');

// GET all projects
router.get('/', async (req, res) => {
  try {
    const projects = await Project.findAll({
      include: [{ model: User, as: 'Lead', attributes: ['id', 'name', 'email'] }],
      order: [['created_at', 'DESC']]
    });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create new
router.post('/', async (req, res) => {
  try {
    const project = await Project.create(req.body);
    const newProject = await Project.findByPk(project.id, {
      include: [{ model: User, as: 'Lead', attributes: ['id', 'name', 'email'] }]
    });
    res.status(201).json(newProject);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT update
router.put('/:id', async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    await project.update(req.body);
    const updatedProject = await Project.findByPk(project.id, {
      include: [{ model: User, as: 'Lead', attributes: ['id', 'name', 'email'] }]
    });
    res.json(updatedProject);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE
router.delete('/:id', async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    await project.destroy();
    res.json({ message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
