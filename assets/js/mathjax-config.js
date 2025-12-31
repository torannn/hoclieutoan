window.MathJax = {
  tex: {
    inlineMath: [['$', '$'], ['\\(', '\\)']],
    displayMath: [['$$', '$$'], ['\\[', '\\]']]
  },
  options: {
    enableMenu: false
  },
  startup: {
    ready: () => {
      console.log('MathJax is ready!');
      MathJax.startup.defaultReady();
    }
  }
};
