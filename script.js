document.addEventListener('DOMContentLoaded', () => {
    // --- 1. Smooth Scroll for Navbar Links ---
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();

            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });

            // Close mobile menu if open
            if (mobileNavOverlay.style.width === '100%') {
                mobileNavOverlay.style.width = '0%';
            }
        });
    });

    // --- 2. Mobile Menu Toggle ---
    const menuToggle = document.querySelector('.menu-toggle');
    const closeBtn = document.querySelector('.close-btn');
    const mobileNavOverlay = document.getElementById('mobileNavOverlay');
    const mobileNavLinks = document.querySelector('.nav-links-mobile');

    menuToggle.addEventListener('click', () => {
        mobileNavOverlay.style.width = '100%';
    });

    closeBtn.addEventListener('click', () => {
        mobileNavOverlay.style.width = '0%';
    });

    // Close mobile menu when a link is clicked
    mobileNavLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            mobileNavOverlay.style.width = '0%';
        });
    });


    // --- 3. Mental Health Assessment Card Link ---
    const mentalHealthAssessmentCard = document.getElementById('mentalHealthAssessmentCard');
    if (mentalHealthAssessmentCard) {
        mentalHealthAssessmentCard.addEventListener('click', () => {
            window.open('https://dmh.go.th/test/thaiqmhi/', '_blank'); // Open in new tab
        });
    }

    // --- 4. Daily Advice & Quote ---
    const dailyQuotes = [
        "เริ่มต้นวันใหม่ด้วยรอยยิ้มและใจที่พร้อมรับฟัง",
        "ทุกปัญหาที่เข้ามาคือโอกาสให้เราเติบโต",
        "ความเข้มแข็งไม่ได้มาจากสิ่งที่คุณทำได้เสมอไป แต่อยู่ที่การเอาชนะสิ่งที่คุณเคยคิดว่าทำไม่ได้ต่างหาก",
        "คุณไม่ได้อยู่คนเดียว เราอยู่ตรงนี้พร้อมรับฟังเสมอ",
        "ไม่มีใครสมบูรณ์แบบ การยอมรับข้อบกพร่องคือจุดเริ่มต้นของความสุข",
        "ให้กำลังใจตัวเองเสมอ เพราะคุณคู่ควรกับความสุข",
        "ความกลัวเป็นเพียงภาพลวงตา จงกล้าที่จะก้าวเดินต่อไป",
        "อย่าเปรียบเทียบชีวิตตัวเองกับใคร จงเป็นตัวเองในแบบที่ดีที่สุด"
    ];

    const dailyQuoteElement = document.getElementById('daily-quote');
    if (dailyQuoteElement) {
        const randomIndex = Math.floor(Math.random() * dailyQuotes.length);
        dailyQuoteElement.textContent = dailyQuotes[randomIndex];
    }

    // --- 5. AI Venting (เชื่อมต่อกับ Backend AI - Gemma ผ่าน Ollama) ---
    const aiInput = document.getElementById('ai-input');
    const aiSendBtn = document.getElementById('aiSendBtn');
    const aiResponse = document.getElementById('ai-response');

    if (aiSendBtn && aiInput && aiResponse) {
        aiSendBtn.addEventListener('click', async () => {
            const userMessage = aiInput.value.trim();
            if (userMessage === '') {
                aiResponse.textContent = 'คุณยังไม่ได้พิมพ์อะไรเลยนะ ลองพิมพ์ระบายออกมาสิ';
                return;
            }

            aiResponse.textContent = 'AI กำลังคิดคำตอบ...'; // แสดงสถานะโหลด
            aiInput.value = ''; // ล้างข้อความหลังจากส่ง

            try {
                const response = await fetch('/api/ai_response', { // เรียก API ใน Backend
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ message: userMessage })
                });

                const data = await response.json();
                if (response.ok) {
                    aiResponse.textContent = data.response;
                } else {
                    aiResponse.textContent = `เกิดข้อผิดพลาด: ${data.response || 'ไม่สามารถรับคำตอบจาก AI ได้'}`;
                }
            } catch (error) {
                console.error('Error fetching AI response:', error);
                aiResponse.textContent = 'เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI Server';
            }
        });
    }


    // --- 6. Anonymous Chat (Socket.IO Client) ---
    const socket = io(); // Connect to the Socket.IO server
    const findPartnerBtn = document.getElementById('findPartnerBtn');
    const leaveChatBtn = document.getElementById('leaveChatBtn');
    const chatStatus = document.getElementById('chatStatus');
    const chatBox = document.getElementById('chatBox');
    const chatMessages = document.getElementById('chatMessages');
    const chatInput = document.getElementById('chatInput');
    const sendMessageBtn = document.getElementById('sendMessageBtn');

    let currentRoom = null; // Store the current chat room ID

    if (findPartnerBtn && leaveChatBtn && chatStatus && chatBox && chatMessages && chatInput && sendMessageBtn) {
        findPartnerBtn.addEventListener('click', () => {
            socket.emit('find_partner');
            chatStatus.textContent = 'กำลังหาเพื่อนรับฟัง...';
            findPartnerBtn.disabled = true;
        });

        leaveChatBtn.addEventListener('click', () => {
            if (currentRoom) {
                socket.emit('leave_chat', { room: currentRoom });
                resetChatUI();
            }
        });

        sendMessageBtn.addEventListener('click', () => {
            const message = chatInput.value.trim();
            if (message && currentRoom) {
                socket.emit('send_message', { room: currentRoom, message: message });
                // Display own message immediately
                addMessageToChat('คุณ', message, 'self');
                chatInput.value = ''; // Clear input
            }
        });

        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessageBtn.click();
            }
        });

        socket.on('status_message', (data) => {
            chatStatus.textContent = data.message;
        });

        socket.on('chat_ready', (data) => {
            currentRoom = data.room;
            chatStatus.textContent = 'เชื่อมต่อแล้ว! เริ่มแชทได้เลย';
            findPartnerBtn.style.display = 'none';
            leaveChatBtn.style.display = 'inline-block';
            chatBox.style.display = 'flex'; // Show chat box
            chatInput.disabled = false;
            sendMessageBtn.disabled = false;
            addMessageToChat('ระบบ', data.message, 'system');
        });

        socket.on('receive_message', (data) => {
            addMessageToChat('เพื่อนรับฟัง', data.message, 'other');
        });

        socket.on('partner_disconnected', () => {
            addMessageToChat('ระบบ', 'เพื่อนรับฟังของคุณได้ออกจากห้องแล้ว การสนทนาสิ้นสุดลง', 'system');
            resetChatUI();
        });

        function addMessageToChat(sender, message, type) {
            const messageElement = document.createElement('div');
            messageElement.classList.add('chat-message', type);
            messageElement.textContent = `${sender}: ${message}`;
            chatMessages.appendChild(messageElement);
            chatMessages.scrollTop = chatMessages.scrollHeight; // Scroll to bottom
        }

        function resetChatUI() {
            currentRoom = null;
            chatStatus.textContent = 'ยังไม่มีการเชื่อมต่อ';
            findPartnerBtn.style.display = 'inline-block';
            findPartnerBtn.disabled = false;
            leaveChatBtn.style.display = 'none';
            chatBox.style.display = 'none'; // Hide chat box
            chatInput.disabled = true;
            sendMessageBtn.disabled = true;
            chatMessages.innerHTML = ''; // Clear messages
        }
    }


    // --- 7. Contact Form Submission ---
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Prevent default form submission

            const formData = new FormData(contactForm);
            const data = {};
            formData.forEach((value, key) => {
                data[key] = value;
            });

            try {
                const response = await fetch('/api/contact', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });

                const result = await response.json();
                if (response.ok) {
                    alert('รับข้อความของคุณแล้ว ขอบคุณครับ!');
                    contactForm.reset(); // Clear the form
                } else {
                    alert(`เกิดข้อผิดพลาด: ${result.error || 'ไม่สามารถส่งข้อความได้'}`);
                }
            } catch (error) {
                console.error('Error submitting contact form:', error);
                alert('เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่');
            }
        });
    }
});