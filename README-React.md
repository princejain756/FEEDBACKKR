# Kriedko Feedback Form - React App

A modern React application for collecting and managing customer feedback for Kriedko Culinary Collective.

## Features

- **Modern React Architecture**: Built with React 18, React Router, and custom hooks
- **Local Storage**: All data is stored locally in the browser
- **Responsive Design**: Mobile-first design that works on all devices
- **Real-time Analytics**: Live statistics and sentiment analysis
- **Export/Import**: Backup and restore feedback data
- **Admin Dashboard**: Complete management interface

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

### Building for Production

```bash
npm run build
```

This builds the app for production to the `build` folder.

### Serving Production Build

```bash
npm run serve
```

This serves the production build on port 3000.

## Project Structure

```
src/
├── components/
│   ├── FeedbackForm.js      # Main feedback form component
│   └── AdminDashboard.js    # Admin dashboard component
├── hooks/
│   └── useLocalStorage.js   # Custom hook for local storage
├── styles/
│   ├── App.css              # Main application styles
│   ├── AdminDashboard.css   # Admin dashboard styles
│   └── FeedbackForm.css     # Feedback form styles
├── App.js                   # Main app component with routing
└── index.js                 # React entry point
```

## Features Overview

### Feedback Form
- Interactive rating system (1-5 stars)
- Meal preference selection
- Open-ended questions
- Real-time progress tracking
- Form validation
- Success toast notifications

### Admin Dashboard
- Real-time statistics
- Feedback table with search and filtering
- Export data to JSON
- Import data from JSON
- Clear all data functionality
- Responsive mobile design

### Local Storage
- Persistent data storage
- Automatic data backup
- Cross-tab synchronization
- Data validation and error handling

## Usage

1. **Submit Feedback**: Fill out the form on the main page
2. **View Analytics**: Access the admin dashboard at `/admin`
3. **Manage Data**: Use export/import/clear functions in admin
4. **Search & Filter**: Find specific feedback using search and sentiment filters

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Development

The app uses:
- React 18 with hooks
- React Router for navigation
- Custom CSS with CSS variables
- Local Storage API
- Modern JavaScript (ES6+)

## Deployment

The app can be deployed to any static hosting service:
- Vercel
- Netlify
- GitHub Pages
- AWS S3
- Any web server

Just run `npm run build` and serve the `build` folder.

