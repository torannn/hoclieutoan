window.MathJax = {
  tex: {
    inlineMath: [['$', '$'], ['\\(', '\\)']]
  },
  output: {
    font: 'mathjax-pagella'
  },
  startup: {
    ready: () => {
      console.log('MathJax is ready!');
      MathJax.startup.defaultReady();
    }
  }
};
