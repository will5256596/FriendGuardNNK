# app.py
from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit
import requests
import json
import os # <-- สำคัญมาก: ต้องมีบรรทัดนี้เพื่อใช้งาน Environment Variables
import google.generativeai as genai

app = Flask(__name__, template_folder='templates', static_folder='public')
app.config['SECRET_KEY'] = 'your_secret_key_here' # ควรเปลี่ยนเป็น Secret Key ที่แข็งแกร่งและไม่ซ้ำใคร
socketio = SocketIO(app)

# --- การตั้งค่า AI (Google Gemini API) ---
# สำคัญ: GEMINI_API_KEY จะถูกดึงมาจาก Environment Variables บน Render.com
# ห้ามใส่ API Key ของคุณที่นี่โดยตรงเด็ดขาด!
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    # หากรันบน Render และไม่ได้ตั้งค่า Env Var จะเกิดข้อผิดพลาดนี้
    # หากรันบนเครื่องคุณเอง และไม่ได้ตั้งค่าใน .env ก็จะเกิดข้อผิดพลาดนี้
    raise ValueError("GEMINI_API_KEY environment variable not set. Please set it on Render.com or in your local .env file.")

genai.configure(api_key=GEMINI_API_KEY)
llm_model = genai.GenerativeModel('gemini-pro')

@app.route('/')
def index():
    return render_template('index.html')

# Endpoint สำหรับ AI response (ถ้ามีในโปรเจกต์ของคุณ)
@app.route('/api/ai_response', methods=['POST'])
def ai_response():
    try:
        user_input = request.json.get('message')
        if not user_input:
            return jsonify({'error': 'No message provided'}), 400

        # ใช้ model.generate_content แทน model.generate เพื่อความยืดหยุ่น
        # และจัดการ Response ได้ดีขึ้น
        response = llm_model.generate_content(user_input)

        # ตรวจสอบว่า response มี text หรือไม่
        if response and response.text:
            return jsonify({'response': response.text})
        else:
            # กรณีที่ AI ไม่ได้สร้าง text response (เช่น มี safety issues)
            return jsonify({'response': 'ขออภัยค่ะ AI ไม่สามารถตอบคำถามนี้ได้ในขณะนี้'}), 200

    except Exception as e:
        # ดักจับข้อผิดพลาดและส่งกลับไปที่ Frontend เพื่อ Debugging
        print(f"Error in AI response: {e}")
        return jsonify({'error': str(e)}), 500

# Socket.IO Event Handlers
@socketio.on('join_room')
def handle_join_room(data):
    room = data['room']
    print(f"User joined room: {room}")
    emit('status', {'msg': f'User joined room: {room}.'}) # เพื่อแสดงสถานะใน UI

@socketio.on('message')
def handle_message(data):
    msg = data['msg']
    room = data['room']
    print(f"Message from {room}: {msg}")
    emit('message', {'msg': msg, 'room': room}, room=room)

if __name__ == '__main__':
    # สำหรับการรันบนเครื่องคอมพิวเตอร์ของคุณในโหมด Debugging
    # ใน Production บน Render.com จะใช้ Gunicorn รันแทน
    print("Running Flask app in development mode. For production, use Gunicorn/gunicorn.")
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)
