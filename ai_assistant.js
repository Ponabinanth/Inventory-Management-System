document.addEventListener('DOMContentLoaded', () => {
  const fabBtn = document.getElementById('aiChatFabBtn');
  const chatWindow = document.getElementById('aiChatWindow');
  const closeBtn = document.getElementById('closeAiChatBtn');
  const chatInput = document.getElementById('aiChatInput');
  const sendBtn = document.getElementById('aiChatSendBtn');
  const messagesContainer = document.getElementById('aiChatMessages');

  // Toggle Chat Window
  fabBtn.addEventListener('click', () => {
    chatWindow.classList.toggle('hidden');
    if (!chatWindow.classList.contains('hidden')) {
      chatInput.focus();
    }
  });

  closeBtn.addEventListener('click', () => {
    chatWindow.classList.add('hidden');
  });

  // Handle Send Message
  const sendMessage = () => {
    const text = chatInput.value.trim();
    if (!text) return;

    // Add user message
    const userMsg = document.createElement('div');
    userMsg.className = 'ai-msg user';
    userMsg.textContent = text;
    messagesContainer.appendChild(userMsg);

    chatInput.value = '';
    scrollToBottom();

    // Simulate AI typing and response
    setTimeout(() => {
      const botMsg = document.createElement('div');
      botMsg.className = 'ai-msg bot';
      botMsg.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Thinking...';
      messagesContainer.appendChild(botMsg);
      scrollToBottom();

      setTimeout(() => {
        botMsg.innerHTML = getAiResponse(text);
        scrollToBottom();
      }, 1000);
    }, 500);
  };

  sendBtn.addEventListener('click', sendMessage);
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });

  function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // Simple hardcoded AI logic for mockup
  function getAiResponse(query) {
    const lowerQ = query.toLowerCase();
    if (lowerQ.includes('stock') || lowerQ.includes('inventory')) {
      return "Based on current data, your overall stock levels are healthy. However, 3 items are approaching low-stock thresholds.";
    } else if (lowerQ.includes('sale') || lowerQ.includes('revenue')) {
      return "Sales have increased by 18% compared to last month. Top selling item is 'Wireless Mouse'.";
    } else if (lowerQ.includes('predict') || lowerQ.includes('trend')) {
      return "Our predictive analytics indicate a potential spike in demand for Electronics next week. Consider restocking soon.";
    } else if (lowerQ.includes('hello') || lowerQ.includes('hi')) {
      return "Hello! I am ready to help you analyze your inventory.";
    } else {
      return "That's an interesting question! As an AI assistant, I can analyze stock trends, sales data, and predict inventory shortages. Try asking me about 'sales' or 'stock'.";
    }
  }
});
