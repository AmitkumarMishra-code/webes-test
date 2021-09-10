import Webex from 'webex'
import { useEffect, useRef, useState } from 'react';
const accessToken = 'NTA5MTUyZDMtZTZkYS00MmNiLWJmYTktMjk0ZDc5NjllMGE1OGFkZmQ1ZmEtMDFj_P0A1_a7012a36-a278-4b69-929e-ec5cc7b86d17';
let webex
let currentMediaStreams = []
let conversationURL = 'https://conv-r.wbx2.com/conversation/api/v1/conversations/3809de60-122a-11ec-a32a-13d19edd46e0'
let mediaSettings = {
    receiveAudio: true,
    receiveVideo: true,
    receiveShare: true,
    sendAudio: true,
    sendVideo: true,
    sendShare: false
}

export default function JoinMeeting() {
    const meetingIdRef = useRef()
    const [connected, setConnected] = useState(false)
    const [registered, setRegistered] = useState(false)
    const [unregistered, setUnregistered] = useState(null)
    const [meetingObject, setMeetingObject] = useState(null)
    const [meetingCurrentDetails, setMeetingCurrentDetails] = useState(null)
    const localStreamRef = useRef()
    const remoteStreamRef = useRef()

    const initWebex = () => {
        console.log('Authentication#initWebex()');
        webex = window.webex = Webex.init({
            config: {
                logger: {
                    level: 'debug'
                },
                meetings: {
                    reconnection: {
                        enabled: true
                    },
                    enableRtx: true
                }
                // Any other sdk config we need
            },
            credentials: {
                access_token: accessToken
            }
        });

        webex.once('ready', () => {
            console.log('Authentication#initWebex() :: Webex Ready');
            setConnected(true)
            register()
        });
    }

    const register = () => {
        setRegistered(false)
        console.log('Authentication#register()');

        webex.meetings.register()
            .then(() => {
                console.log('Authentication#register() :: successfully registered');
            })
            .catch((error) => {
                console.warn('Authentication#register() :: error registering', error);
            })
            .finally(() => {
                setRegistered(true)
            });

        webex.meetings.on('meeting:added', (m) => {
            const { type } = m;

            if (type === 'INCOMING') {
                const newMeeting = m.meeting;
                newMeeting.acknowledge(type);
            }
        });
    }


    const unregister = () => {
        console.log('Authentication#unregister()');

        webex.meetings.unregister()
            .then(() => {
                console.log('Authentication#register() :: successfully unregistered');
            })
            .catch((error) => {
                console.warn('Authentication#register() :: error unregistering', error);
            })
            .finally(() => {
                setUnregistered(true)
            });
    }

    // function joinMeeting() {

    //     if (!meetingObject) {
    //         throw new Error(`meeting ${meetingObject.id} is invalid or no longer exists`);
    //     }
    //     // const joinOptions = {
    //     //     pin: '5683',
    //     //     moderator: true,
    //     //     moveToResource: false,
    //     //     resourceId: webex.devicemanager._pairedDevice ?
    //     //         webex.devicemanager._pairedDevice.identity.id :
    //     //         undefined,
    //     //     receiveTranscription: false
    //     // };

    // meetingObject.join()
    // .then(() => {
    //     setMeetingCurrentDetails(meetingObject.destination ||
    //         meetingObject.sipUri ||
    //         meetingObject.id)
    //     getMediaStreams(mediaSettings, {})
    //     // meetingsLeaveElm.onclick = () => leaveMeeting(meetingObject.id);
    // });
    // }

    function leaveMeeting() {
        if (!meetingObject) {
            throw new Error(`meeting is invalid or no longer exists`);
        }

        meetingObject.leave()
            .then(() => {
                setMeetingCurrentDetails(null)
            });
    }

    function addMedia() {
        const meeting = meetingObject;
        const [localStream, localShare] = currentMediaStreams;

        console.log('MeetingStreams#addMedia()');

        if (!meeting) {
            console.log('MeetingStreams#addMedia() :: no valid meeting object!');
        }

        meeting.addMedia({
            localShare,
            localStream,
            mediaSettings: mediaSettings
        }).then(() => {
            console.log('MeetingStreams#addMedia() :: successfully added media!');
        }).catch((error) => {
            console.log('MeetingStreams#addMedia() :: Error adding media!');
            console.error(error);
        });

        // Wait for media in order to show video/share
        meeting.on('media:ready', (media) => {
            // eslint-disable-next-line default-case
            switch (media.type) {
                case 'remoteVideo':
                    console.log('remote video')
                    remoteStreamRef.current.srcObject = media.stream;
                    break;
                case 'remoteAudio':
                    console.log('remote audio')
                    //   meetingStreamsRemoteAudio.srcObject = media.stream;
                    break;
                case 'remoteShare':
                    console.log('remote share')
                    //   meetingStreamsRemoteShare.srcObject = media.stream;
                    break;
                case 'localShare':
                    localStreamRef.current.srcObject = media.stream;
                    break;
            }
        });
    }

    function getMediaStreams(mediaSettings, audioVideoInputDevices = {}) {
        const meeting = meetingObject;

        console.log('MeetingControls#getMediaStreams()');

        if (!meeting) {
            console.log('MeetingControls#getMediaStreams() :: no valid meeting object!');

            return Promise.reject(new Error('No valid meeting object.'));
        }

        // Get local media streams
        return meeting.getMediaStreams(mediaSettings, audioVideoInputDevices)
            .then(([localStream, localShare]) => {
                console.log('MeetingControls#getMediaStreams() :: Successfully got following streams', localStream, localShare);
                // Keep track of current stream in order to addMedia later.
                const [currLocalStream, currLocalShare] = currentMediaStreams;

                /*
                 * In the event of updating only a particular stream, other streams return as undefined.
                 * We default back to previous stream in this case.
                 */
                currentMediaStreams = [localStream || currLocalStream, localShare || currLocalShare];

                return currentMediaStreams;
            })
            .then(([localStream]) => {
                if (localStream && mediaSettings.sendVideo) {
                    console.log('localstream')
                    localStreamRef.current.srcObject = localStream;
                    addMedia()
                }

                return { localStream };
            })
            .catch((error) => {
                console.log('MeetingControls#getMediaStreams() :: Error getting streams!');
                console.error();

                return Promise.reject(error);
            });
    }


    const joinMeetingHandler = async() => {
        conversationURL = meetingIdRef.current.value
        let myMeeting = await webex.meetings.create(conversationURL)
        setMeetingObject(myMeeting)
        myMeeting.join()
            .then(() => {
                setMeetingCurrentDetails(myMeeting.destination ||
                    myMeeting.sipUri ||
                    myMeeting.id)
                getMediaStreams(mediaSettings, {})
                // meetingsLeaveElm.onclick = () => leaveMeeting(meetingObject.id);
            });
    }


    useEffect(() => {
        initWebex()
        // eslint-disable-next-line
    }, [])

    return (
        <div>
            {connected ? <p>Connected</p> : <p>Connecting...</p>}
            {registered ? <p>Registered</p> : <p>Registering...</p>}
            <button onClick={unregister}>Unregister</button>
            {unregistered && <p>Unregistered</p>}
            <label style={{ marginRight: '2rem' }}>Conversation URL : </label>
            <input type='text' placeholder='meeting id' ref={meetingIdRef} />
            <button onClick={joinMeetingHandler}>Join</button>
            {meetingCurrentDetails && <p>{meetingCurrentDetails}</p>}
            <button onClick={leaveMeeting}>Leave</button>

            <div style={{ width: '30vw', height: '20vh' }}>
                <video className='localstream' id='localstream' ref={localStreamRef} autoPlay playsInline></video>
            </div>
            <div style={{ width: '30vw', height: '20vh' }}>
                <video className='remotestream' id='remotestream' ref={remoteStreamRef} autoPlay playsInline></video>
            </div>
        </div>
    )
}