# FlowCheck - README

## 📋 Overview

FlowCheck is a modern, intuitive time-tracking application designed to help you monitor your focused work sessions. With smart inactivity detection, detailed analytics, and seamless cloud synchronization, FlowCheck helps you understand your work patterns and improve productivity.

## ✨ Features

- **⏱️ Smart Timer**: Automatic inactivity detection (45min + 30min intervals)
- **📊 Visual Analytics**: Interactive charts showing weekly activity and daily distributions
- **☁️ Cloud Sync**: Firebase-powered data synchronization across devices
- **📤 One-Click Export**: Download your session data as CSV
- **🎨 Theme Support**: Light and dark mode with persistent preferences
- **📱 Responsive Design**: Optimized for desktop and mobile devices
- **🔐 Secure Authentication**: Email/password authentication with Firebase Auth

## 🚀 Getting Started

### Prerequisites

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection for Firebase services

### Installation

1. Clone or download the project files
2. Open `index.html` in your web browser
3. Create an account or log in to start tracking

### Using FlowCheck

1. **Sign Up**: Create a new account with your email
2. **Start Session**: Enter a description and click "Start"
3. **Stay Focused**: FlowCheck will prompt you if inactivity is detected
4. **Review Analytics**: View your stats and charts on the dashboard
5. **Export Data**: Download your session history as CSV when needed

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Firebase (Authentication & Firestore)
- **Charts**: Chart.js for data visualization
- **Icons**: Emoji-based icon system
- **Date Handling**: date-fns library

## 📁 Project Structure

```
flowcheck/
├── index.html          # Main application file
├── style.css           # All styles and responsive design
├── script.js           # Application logic and Firebase integration
└── target.png          # Application logo
```

## 🔧 Configuration

FlowCheck uses Firebase for backend services.

## 🎨 Customization

### Themes

FlowCheck supports both light and dark themes. Users can toggle between themes using the moon/sun icon in the navigation.

### Styling

The application uses CSS custom properties for theming:

```css
:root {
    --bg-primary: #0a0a0a;
    --bg-secondary: #111111;
    --accent-primary: #00d4ff;
    /* ... more variables */
}
```

## 📊 Data Model

Sessions are stored with the following structure:
- `description`: Task description
- `start`: Start timestamp
- `end`: End timestamp
- `durationMs`: Session duration in milliseconds
- `userId`: Associated user ID
- `createdAt`: Server timestamp

## 🌐 Browser Support

FlowCheck works on all modern browsers including:
- Chrome 60+
- Firefox 60+
- Safari 12+
- Edge 79+

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

We welcome contributions to FlowCheck! Please feel free to submit pull requests or open issues for bugs and feature requests.

## 🐛 Known Issues

- Session data is not persisted if the browser is closed during an active timer
- Charts might need a refresh after theme changes on some devices

## 📈 Future Enhancements

- [ ] Pomodoro technique integration
- [ ] Customizable inactivity intervals
- [ ] Project categorization
- [ ] Team collaboration features
- [ ] Mobile app version
- [ ] Browser extension
- [ ] Integration with calendar apps

## 🆘 Support

If you encounter any issues or have questions about FlowCheck:

1. Check the [GitHub Issues](../../issues) for known problems
2. Create a new issue for bugs or feature requests
3. Contact us at support@flowcheck.app (placeholder)

## 🙏 Acknowledgments

- Firebase for backend services
- Chart.js for data visualization
- Google Fonts for Inter and JetBrains Mono typefaces
- Date-fns for date manipulation

---

**FlowCheck** - Flow better. Work smarter. 🚀
