import { Device, OpenVidu, Publisher, Session, StreamManager, } from 'openvidu-browser';

import axios from 'axios';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import UserVideoComponent from './UserVideoComponents';
import { Box } from '@mui/material';
import VideoCallToolBar from './VideoCallToolBar';
import {jwtDecode} from 'jwt-decode';
import { useParams } from 'react-router';

// 서버 주소 (현재는 튜토리얼 서버)
const APPLICATION_SERVER_URL = "http://localhost:5000/";
interface DecodedUserInfo{
    userId: string,
    id: string,
    type: string,
    nickname: string,
    iat: number,
    exp: number
  }

// 화상회의 주요 구성 요소 컴포넌트 : 화상회의 참여 및 관리 기능
const VideoCallBoxList = () => {
    const {serverId} = useParams();
    const [mySessionId, setMySessionId] = useState(serverId || '');
    const localNickName = localStorage.getItem('dicoTown_AccessToken') || '익명'; // 기본값 설정

    // 유저 이름 디코딩해서 사용하기 (만약 이후 백엔드에서 따로 응답값 준다면 그걸로 변경)
    let userNickName;

    if (localNickName !== '익명') {
    try {
        const decoded : DecodedUserInfo = jwtDecode(localNickName); // JWT 디코딩
        userNickName = decoded.nickname
    } catch (error) {
        console.error('Token decoding failed:', error);
        userNickName = '익명'; // 디코딩 실패 시 기본값
    }
    } else {
        userNickName = '익명'; // 기본값
    }
    const [myUserName, setMyUserName] = useState(userNickName) //참가자 닉네임
    const [session, setSession] = useState<Session | ''>('');
    const [mainStreamManager, setMainStreamManager] = useState<Publisher | null >(null);
    const [publisher, setPublisher] = useState<Publisher | null>(null); //영상 송출자 : 로컬 웹캠 스트림
    const [subscribers, setSubscribers] = useState<StreamManager[]>([]); // 영상 시청자 : 다른 사용자 활성 스트림
    const [currentVideoDevice, setCurrentVideoDevice] = useState<Device | null>(null);

    const [isAudioEnabled, setIsAudioEnabled] = useState(false); //로컬 오디오 실행중
    const [isVideoEnabled, setIsVideoEnabled] = useState(false); //로컬 비디오 실행중


    const OV = useRef(new OpenVidu());

    //세션아이디 변경
    const handleChangeSessionId = useCallback((e : React.ChangeEvent<HTMLInputElement>) => {
        setMySessionId(e.target.value);
    }, []);

    // 유저이름 직접 변경
    const handleChangeUserName = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setMyUserName(e.target.value);
    }, []);

    // 
    const handleMainVideoStream = useCallback((stream: StreamManager) => {
      const publisher = stream as Publisher; // 타입 변환

    if (mainStreamManager !== publisher) {
        setMainStreamManager(publisher);
        }
    }, [mainStreamManager]);

    // join 버튼을 클릭한 후에 호출됨. (사용자 닉네임 입력, server에서 두개의 토큰을 가져옴)
    const joinSession = useCallback(() => {
        const mySession = OV.current.initSession();

        mySession.on('streamCreated', (event) => {
            const subscriber = mySession.subscribe(event.stream, undefined);
            setSubscribers((subscribers) => [...subscribers, subscriber]);
        });

        mySession.on('streamDestroyed', (event) => {
            deleteSubscriber(event.stream.streamManager);
        });

        mySession.on('exception', (exception) => {
            console.warn(exception);
        });

        setSession(mySession);
    }, []);

    useEffect(()=>{
        joinSession();
    },[])
    

    useEffect(() => {
        if (session) {
            // Get a token from the OpenVidu deployment
            getToken().then(async (token) => {
                try {
                    await session.connect(token, { clientData: myUserName });

                    let publisher = await OV.current.initPublisherAsync(undefined, {
                        audioSource: undefined,
                        videoSource: undefined,
                        publishAudio: false, //초기에 오디오 끄기
                        publishVideo: false, //초기에 비디오 끄기
                        resolution: '640x480',
                        frameRate: 30,
                        insertMode: 'APPEND',
                        mirror: false,
                    });

                    session.publish(publisher);

                    const devices = await OV.current.getDevices();
                    const videoDevices = devices.filter(device => device.kind === 'videoinput');
                    const currentVideoDeviceId = publisher.stream.getMediaStream().getVideoTracks()[0].getSettings().deviceId;
                    const currentVideoDevice = videoDevices.find(device => device.deviceId === currentVideoDeviceId);
                    setMainStreamManager(publisher);
                    setPublisher(publisher);
                    if (currentVideoDevice) {
                      setCurrentVideoDevice(currentVideoDevice);
                  } else {
                      setCurrentVideoDevice(null); // 필요에 따라 null로 설정
                  }
                } catch (error) {
                  if (error instanceof Error) {
                    console.log(error.message)
                  } else {
                    console.log(String(error))
                  }
                }
            });
        }
    }, [session, myUserName]);

    const toggleAudio = () => {
        if (publisher) {
            const audioEnabled = !isAudioEnabled;
            publisher.publishAudio(audioEnabled); // 오디오 상태 변경
            setIsAudioEnabled(audioEnabled);
            console.log(`Audio is now ${audioEnabled ? 'enabled' : 'disabled'}`); // 상태 확인
        } else {
            console.error('Publisher is not initialized.');
        }
    };

    const toggleVideo = () => {
        if (publisher) {
            const videoEnabled = !isVideoEnabled;
            publisher.publishVideo(videoEnabled);
            setIsVideoEnabled(videoEnabled);
        }
    };



    const leaveSession = useCallback(() => {
        // Leave the session
        if (session) {
            session.disconnect();
        }
    
        // Reset all states and OpenVidu object
        OV.current = new OpenVidu();
        setSession('');
        setSubscribers([]);
        setMySessionId('');
        setMyUserName('');
        setMainStreamManager(null);
        setPublisher(null);
    }, [session]);

    // 비디오 장치 전환 기능 (이후에는 자동 스위치가 아니라, 목록만 불러와서 사용자가 직접 선택할 수 있게끔 하는게 좋아보임)
    const switchCamera = useCallback(async () => {
        try {
            const devices = await OV.current.getDevices(); //미디어 장치 목록 가져오기
            const videoDevices = devices.filter(device => device.kind === 'videoinput'); // 그 중 카메라만 추출
    
            if (videoDevices && videoDevices.length > 1 && currentVideoDevice) { 
                const newVideoDevice = videoDevices.filter(device => device.deviceId !== currentVideoDevice.deviceId);
    
                if (newVideoDevice.length > 0) {
                    const newPublisher = OV.current.initPublisher(undefined, {
                        videoSource: newVideoDevice[0].deviceId,
                        publishAudio: true,
                        publishVideo: true,
                        mirror: true,
                    });
    
                    if (session) {
                      if (mainStreamManager){
                        await session.unpublish(mainStreamManager);
                      }
                        
                        await session.publish(newPublisher);
                        setCurrentVideoDevice(newVideoDevice[0]);
                        setMainStreamManager(newPublisher);
                        setPublisher(newPublisher);
                    }
                }
            }
        } catch (e) {
            console.error(e);
        }
    }, [currentVideoDevice, session, mainStreamManager]);

    const deleteSubscriber = useCallback((streamManager : StreamManager) => {
        setSubscribers((prevSubscribers) => {
            const index = prevSubscribers.indexOf((streamManager));
            if (index > -1) {
                const newSubscribers = [...prevSubscribers];
                newSubscribers.splice(index, 1);
                return newSubscribers;
            } else {
                return prevSubscribers;
            }
        });
    }, []);

    useEffect(() => {
        const handleBeforeUnload = () => {
            leaveSession();
        };
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [leaveSession]);

  /**
     * --------------------------------------------
     * 애플리케이션 서버에서 토큰 받기
     * --------------------------------------------
     * 아래의 메서드는 애플리케이션 서버에 세션과 토큰 생성을 요청합니다.
     * 이렇게 하면 OpenVidu 배포가 안전하게 유지됩니다.
     *
     * 이 샘플 코드에서는 사용자 제어가 전혀 없습니다. 누구든지
     * 애플리케이션 서버의 엔드포인트에 접근할 수 있습니다! 실제 운영 환경에서는
     * 애플리케이션 서버가 사용자를 식별하여 엔드포인트에 대한 접근을 허용해야 합니다.
     *
     * OpenVidu를 애플리케이션 서버에 통합하는 방법에 대한 자세한 내용은
     * https://docs.openvidu.io/en/stable/application-server 를 방문하세요.
     */

    // 서버에 세션아이디로 getToken
    const getToken = useCallback(async () => {
        return createSession(mySessionId).then(sessionId =>
            createToken(sessionId),
        );
    }, [mySessionId]);

    //세션 id로 세션 생성하고 세션 아이디 반환
    const createSession = async (sessionId : string) => {
        const response = await axios.post(APPLICATION_SERVER_URL + 'api/sessions', { customSessionId: sessionId }, {
            headers: { 'Content-Type': 'application/json', },
        });
        return response.data; // The sessionId
    };
    //세션 아이디로 토큰 요청, 토큰 반환
    const createToken = async (sessionId : string) => {
        const response = await axios.post(APPLICATION_SERVER_URL + 'api/sessions/' + sessionId + '/connections', {}, {
            headers: { 'Content-Type': 'application/json', },
        });
        return response.data; // The token
    };
    return (
        <div className='w-100%'>
            {/* {session === '' ? (
                <div id="join">
                    <div id="join-dialog" className="jumbotron vertical-center">
                        <form className="form-group" onSubmit={joinSession}>
                            <p>
                                <label>참가자 이름: </label>
                                <input
                                    className="form-control"
                                    type="text"
                                    id="userName"
                                    value={myUserName}
                                    onChange={handleChangeUserName}
                                    required
                                />
                            </p>
                            <p>
                                <label> 서버 이름: </label>
                                <input
                                    className="form-control"
                                    type="text"
                                    id="sessionId"
                                    value={mySessionId}
                                    onChange={handleChangeSessionId}
                                    required
                                />
                            </p>
                            <p className="text-center">
                                <input className="text-white bg-black rounded-md" name="commit" type="submit" value="JOIN" />
                            </p>
                        </form>
                    </div>
                </div>
            ) : null} */}

            {session !== undefined ? (
                <div id="session">
                    <div id="session-header">
                        <h1 id="session-title">서버 이름 : {mySessionId}</h1>
                        <input
                            className="text-white bg-black rounded-md"
                            type="button"
                            id="buttonLeaveSession"
                            onClick={leaveSession}
                            value="Leave session"
                        />
                        <input
                            className="text-white bg-black rounded-md"
                            type="button"
                            id="buttonSwitchCamera"
                            onClick={switchCamera}
                            value="Switch Camera"
                        />
                    </div>

                    {/* {mainStreamManager !== null ? (
                        <div id="main-video" className="col-md-6">
                            {mainStreamManager && <UserVideoComponent streamManager={mainStreamManager} />} 

                        </div>
                    ) : null} */}
                    <Box sx={{ 
                        display: 'flex', 
                        gap: '16px',
                        height: '128px' 
                        }}>
                        {publisher !== null ? (
                                <div onClick={() => handleMainVideoStream(publisher)} className='h-full'>
                                    { publisher && <UserVideoComponent
                                        streamManager={publisher} isVideoEnabled = {isVideoEnabled}/>}
                                </div>
                            ) : null }
                            {subscribers.map((sub, i) => (
                                <div key={sub.id} onClick={() => handleMainVideoStream(sub)}>
                                    <UserVideoComponent streamManager={sub} isVideoEnabled = {isVideoEnabled}/>
                                </div>
                            ))}
                    </Box>
                
                    
                </div>
            ) : null}
            <div className="fixed bottom-[20px] left-1/2 -translate-x-1/3">
                <VideoCallToolBar 
                    toggleAudio = {toggleAudio}
                    toggleVideo ={toggleVideo}
                    isAudioEnabled = {isAudioEnabled}
                    isVideoEnabled = {isVideoEnabled}
                    />
            </div>
        </div>
    );
}
export default VideoCallBoxList;