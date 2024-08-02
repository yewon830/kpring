import express from 'express';
import https from 'https';
import fs from 'fs';
import { Server as socketIo } from 'socket.io';

interface Room {
  users: string[];
}

const app = express(); // express 애플리케이션 인스턴스 생성
// // 로컬 HTTPS 설정
app.get('/', (req, res) => {
  res.send('Hello, HTTPS!');
});

const options = {
  key: fs.readFileSync('./key.pem'),
  cert: fs.readFileSync('./cert.pem')
};

const server = https.createServer(options, app); // HTTP 서버 생성, 이 서버가 Express 애플리케이션 처리

// socket.io 서버 인스턴스 
const io = new socketIo(server, {
  cors: {
    origin: 'https://localhost:3000', // FIXME :보안을 위해 CORS 설정 구체화 해줘야 함
  },
});

const totalRooms: { [key: string]: Room } = {}; // {방의 이름 : [user 소켓 id]}의 객체

// 클라이언트가 socket.io 서버에 연결 되어있을 때
io.on('connection', (socket: any) => {
  console.log(`Client connected. socket: ${socket.id}`);

  // 채팅을 위한 방에 접속
  socket.on('join', (data: { room: string }) => {
    if (!data?.room) return;
    socket.join(data.room);
    // 방이 없으면 새로운 방을 만든다.
    if (!totalRooms[data.room]) {
      totalRooms[data.room] = { users: [] };
    }
    // 방에 사용자를 추가
    totalRooms[data.room].users.push(socket.id);
    socket.room = data.room;

    console.log(`Join room ${data.room}. Socket ${socket.id}`);

    // 기존 사용자들에게 새로운 사용자 연결 알림
    socket.to(data.room).emit('new-user', { userId: socket.id });
  });

  // peer가 제안 :: SDP 방식(제안-응답)
  socket.on('offer', (data: { sdp: string; receiverId: string }) => {
    io.to(data.receiverId).emit('offer', { sdp: data.sdp, sender: socket.id });
  });

  // peer가 응답
  socket.on('answer', (data: { sdp: string; receiverId: string }) => {
    io.to(data.receiverId).emit('answer', { sdp: data.sdp, sender: socket.id });
  });

  // peer가 자신이 데이터를 보낼 수 있는 네트워크 경로를 찾기 위해 ICE 프로세스 수행
  socket.on('candidate', (data: { candidate: string; receiverId: string }) => {
    io.to(data.receiverId).emit('candidate', { candidate: data.candidate, sender: socket.id });
  });

  // 연결 종료
  socket.on('disconnect', () => {
    // 방에서 사용자 제거
    if (socket.room && totalRooms[socket.room]) {
      totalRooms[socket.room].users = totalRooms[socket.room].users.filter(
        (id) => id !== socket.id
      );
      // 사용자가 한명도 없으면 방 없앰
      if (totalRooms[socket.room].users.length === 0) {
        delete totalRooms[socket.room];
      }
    }
    // 다른 사용자들에게 알림
    if (socket.room) {
      socket.to(socket.room).emit('user-disconnected', { userId: socket.id });
    }
    console.log('Client disconnected');
  });
});

// 포트 실행
server.listen(5001, () => {  // 포트 번호
  console.log('Listening on port 5001');
});