# app.py
from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit
import requests
import json
import os
import google.generativeai as genai

# --- การตั้งค่า AI (Google Gemini API) ---
# **คำเตือนสำคัญ: การใส่ API Key ตรงๆ ในโค้ดแบบนี้ ไม่แนะนำสำหรับการใช้งานจริง (Production) อย่างยิ่ง**
# **เนื่องจากมีความเสี่ยงด้านความปลอดภัยสูงมากที่ API Key จะรั่วไหลหากโค้ดของคุณถูกเปิดเผย**
# **หากคุณต้องการความปลอดภัย โปรดกลับไปใช้วิธีเก็บในไฟล์ .env และใช้ os.getenv()**
GEMINI_API_KEY=AIzaSyDWqbLUkNutqn8JaBDy662V9Try1Sr8z3s # <<< เปลี่ยนตรงนี้เป็น Gemini API Key ของคุณ

if GEMINI_API_KEY and GEMINI_API_KEY != "YOUR_GEMINI_API_KEY_HERE":
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        ai_model = genai.GenerativeModel('gemini-pro') # หรือ 'gemini-1.0-pro'
        print("Gemini AI model initialized successfully.")
    except Exception as e:
        print(f"Error configuring Gemini AI: {e}")
        ai_model = None
else:
    print("GEMINI_API_KEY is missing or is the placeholder. AI functionality might be disabled.")
    ai_model = None


app = Flask(__name__, static_folder='.', static_url_path='')
socketio = SocketIO(app, async_mode='eventlet', cors_allowed_origins="*") # cors_allowed_origins="*" เพื่อให้เข้าถึงได้จากทุก Domain

# ฟังก์ชันสำหรับ AI ให้ระบาย (ใช้ Gemini API)
@app.route('/api/ai_response', methods=['POST'])
def get_ai_response():
    user_message = request.json.get('message')
    print(f"User message for AI: {user_message}")

    if not user_message:
        return jsonify({'response': 'Please provide a message.'}), 400

    if not ai_model:
        return jsonify({'response': 'AI Server (Gemini) ไม่ได้กำหนด API Key หรือเกิดข้อผิดพลาดในการโหลดโมเดล โปรดตรวจสอบการตั้งค่า'}), 500

    try:
        response = ai_model.generate_content(user_message)
        ai_response = response.text

        # ตรวจสอบ Safety Ratings (เป็นสิ่งที่ดีที่ควรมี)
        if hasattr(response, 'prompt_feedback') and response.prompt_feedback.safety_ratings:
            for rating in response.prompt_feedback.safety_ratings:
                if rating.probability > genai.types.HarmProbability.NEGLIGIBLE:
                    print(f"Safety issue detected for category {rating.category.name}: {rating.probability.name}")
                    ai_response = "ฉันขอโทษ ฉันไม่สามารถตอบคำถามนั้นได้ โปรดลองอีกครั้งด้วยข้อความที่แตกต่างออกไป"
                    break

        print(f"AI response (Gemini): {ai_response}")
        return jsonify({'response': ai_response})

    except Exception as e:
        print(f"Error calling Gemini API: {e}")
        return jsonify({'response': f"เกิดข้อผิดพลาดในการเชื่อมต่อ AI: {str(e)} โปรดตรวจสอบ Gemini API Key และการเชื่อมต่ออินเทอร์เน็ต (เช่น Rate Limit, ข้อผิดพลาด API)"}), 500

# --- ส่วนของ Flask-SocketIO (เพื่อนรับฟังปัญหา / Anonymous Chat) ---
@socketio.on('join')
def handle_join(data):
    room = data['room']
    socketio.join_room(room)
    print(f"User joined room: {room}")
    emit('status', {'msg': f'User joined room {room}'}, room=room)

@socketio.on('message')
def handle_message(data):
    msg = data['msg']
    room = data['room']
    print(f"Message from {room}: {msg}")
    emit('message', {'msg': msg}, room=room)

# --- กำหนด Route สำหรับหน้าเว็บหลัก ---
@app.route('/')
def index():
    return render_template('index.html')

# Route เพิ่มเติมสำหรับกรณีที่เปิดไฟล์โดยตรงจาก Public
# ตรวจสอบ Path ของ public/index.html ในโปรเจกต์ของคุณ
@app.route('/public/index.html')
def index_direct():
    return render_template('index.html')


if __name__ == '__main__':
    print("Running Flask app in development mode. For production, use Gunicorn/Nginx.")
    # debug=True จะให้ข้อมูลข้อผิดพลาด แต่ไม่ควรใช้ใน Production
    # host='0.0.0.0' เพื่อให้เข้าถึงได้จาก IP ภายนอกเมื่อรันใน VM
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)