const router = require('express').Router();
const authMiddleware = require('../middleware/auth');

const DUMMY_NEWS = [
  { id:'1', title:'Scientists Discover Water on Mars', category:'Science', image:'https://picsum.photos/seed/mars/400/240', summary:'NASA researchers confirm subsurface water lake beneath Martian south pole.', validity: 94, date:'2025-05-01', source:'NASA' },
  { id:'2', title:'Global EV Sales Hit Record High in Q1 2025', category:'Technology', image:'https://picsum.photos/seed/ev/400/240', summary:'Electric vehicle sales surpassed 4 million units globally in first quarter.', validity: 88, date:'2025-04-30', source:'Reuters' },
  { id:'3', title:'Viral Claim: Drinking Hot Water Cures Diabetes', category:'Health', image:'https://picsum.photos/seed/health1/400/240', summary:'Doctors debunk social media claim spreading across WhatsApp groups.', validity: 12, date:'2025-04-29', source:'WebMD' },
  { id:'4', title:'India GDP Growth Hits 7.8% in FY25', category:'Business', image:'https://picsum.photos/seed/india/400/240', summary:'Finance Ministry reports robust growth driven by manufacturing and services.', validity: 91, date:'2025-04-28', source:'Bloomberg' },
  { id:'5', title:'New AI Model Beats Human Chess Grandmasters', category:'Technology', image:'https://picsum.photos/seed/chess/400/240', summary:'DeepMind\'s latest model achieves 3200 ELO rating in blitz chess.', validity: 76, date:'2025-04-27', source:'The Verge' },
  { id:'6', title:'False: Microchips Found in COVID Vaccines', category:'Health', image:'https://picsum.photos/seed/vax/400/240', summary:'Independent labs confirm no microchips or tracking devices in vaccines.', validity: 3, date:'2025-04-26', source:'WHO' },
  { id:'7', title:'Amazon Rainforest Shows Signs of Recovery', category:'Environment', image:'https://picsum.photos/seed/amazon/400/240', summary:'Satellite data shows 12% increase in vegetation density over five years.', validity: 82, date:'2025-04-25', source:'Nature' },
  { id:'8', title:'India Wins T20 World Cup 2025', category:'Sports', image:'https://picsum.photos/seed/cricket/400/240', summary:'India defeated Australia by 6 wickets in a thrilling final at Melbourne.', validity: 97, date:'2025-04-24', source:'ESPNcricinfo' },
  { id:'9', title:'Tech Layoffs: 50,000 Jobs Cut This Quarter', category:'Business', image:'https://picsum.photos/seed/layoff/400/240', summary:'Major tech firms continue restructuring amid AI automation adoption.', validity: 79, date:'2025-04-23', source:'TechCrunch' },
  { id:'10', title:'Claim: 5G Towers Cause Brain Tumors', category:'Health', image:'https://picsum.photos/seed/5g/400/240', summary:'Multiple peer-reviewed studies find no link between 5G exposure and cancer.', validity: 5, date:'2025-04-22', source:'WHO' },
  { id:'11', title:'James Webb Telescope Captures Oldest Galaxy', category:'Science', image:'https://picsum.photos/seed/jwst/400/240', summary:'New images reveal galaxy formed just 300 million years after Big Bang.', validity: 96, date:'2025-04-21', source:'NASA' },
  { id:'12', title:'India Bans Single-Use Plastics Nationwide', category:'Environment', image:'https://picsum.photos/seed/plastic/400/240', summary:'Government enforces strict new rules on packaging and disposable items.', validity: 88, date:'2025-04-20', source:'The Hindu' },
];

// GET /api/news?category=&page=&limit=
router.get('/', (req, res) => {
  const { category, page = 1, limit = 6 } = req.query;
  let news = DUMMY_NEWS;
  if (category && category !== 'All') news = news.filter(n => n.category === category);
  const start = (page - 1) * limit;
  res.json({ news: news.slice(start, start + Number(limit)), total: news.length });
});

// GET /api/news/top10
router.get('/top10', (req, res) => {
  res.json(DUMMY_NEWS.slice(0, 10));
});

// GET /api/news/categories
router.get('/categories', (req, res) => {
  const cats = ['All', ...new Set(DUMMY_NEWS.map(n => n.category))];
  res.json(cats);
});

// POST /api/news/bookmark/:id
router.post('/bookmark/:id', authMiddleware, async (req, res) => {
  const User = require('../models/User');
  const user = await User.findById(req.user.id);
  const idx = user.bookmarks.indexOf(req.params.id);
  if (idx > -1) user.bookmarks.splice(idx, 1);
  else user.bookmarks.push(req.params.id);
  await user.save();
  res.json({ bookmarks: user.bookmarks });
});

module.exports = router;
module.exports.DUMMY_NEWS = DUMMY_NEWS;
