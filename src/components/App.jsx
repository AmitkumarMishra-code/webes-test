// /* eslint-disable no-undef */
import Webex from 'webex'
import { useEffect, useRef, useState } from 'react';
const accessToken = 'OTI3NDZmNmQtZjFjNi00NWI2LTgxOTAtYmMzMGMzODdjOWMyZjFjNTIzNmYtYjE3_P0A1_a7012a36-a278-4b69-929e-ec5cc7b86d17';
let webex
let currentMediaStreams = []
let mediaSettings = {
    receiveAudio: true,
    receiveVideo: true,
    receiveShare: true,
    sendAudio: true,
    sendVideo: true,
    sendShare: false
}
export default function App() {
    const [connected, setConnected] = useState(false)
    const [registered, setRegistered] = useState(false)
    const [unregistered, setUnregistered] = useState(null)
    const [meetingObject, setMeetingObject] = useState(null)
    const [meetingCurrentDetails, setMeetingCurrentDetails] = useState(null)
    const localStreamRef = useRef()
    const remoteStreamVideoRef = useRef()
    const remoteStreamAudioRef = useRef()

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

    function createMeeting() {
        webex.meetings.create("Y2lzY29zcGFyazovL3VybjpURUFNOnVzLXdlc3QtMl9yL1JPT00vMzgwOWRlNjAtMTIyYS0xMWVjLWEzMmEtMTNkMTllZGQ0NmUw")
            .then((meeting) => {
                // generalStartReceivingTranscription.disabled = false;
                setMeetingObject(meeting)
                console.log(meeting)
            });
    }

    function joinMeeting() {

        if (!meetingObject) {
            throw new Error(`meeting ${meetingObject.id} is invalid or no longer exists`);
        }

        // const joinOptions = {
        //     pin: '5683',
        //     moderator: true,
        //     moveToResource: false,
        //     resourceId: webex.devicemanager._pairedDevice ?
        //         webex.devicemanager._pairedDevice.identity.id :
        //         undefined,
        //     receiveTranscription: false
        // };

        meetingObject.join()
            .then(() => {
                setMeetingCurrentDetails(meetingObject.destination ||
                    meetingObject.sipUri ||
                    meetingObject.id)
                getMediaStreams(mediaSettings, {})
                // meetingsLeaveElm.onclick = () => leaveMeeting(meetingObject.id);
            });
    }

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
                    remoteStreamVideoRef.current.srcObject = media.stream;
                    break;
                case 'remoteAudio':
                    console.log('remote audio')
                    remoteStreamAudioRef.current.srcObject = media.stream;
                    break;
                case 'remoteShare':
                    console.log('remote share')
                    //   meetingStreamsRemoteShare.srcObject = media.stream;
                    break;
                case 'localShare':
                    console.log('in local share case')
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
                // meeting.updateShare({ sendShare: true, receiveShare: true, stream: localShare })
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


    useEffect(() => {
        initWebex()
        // eslint-disable-next-line
    }, [])

    return (
        <div>
            <p>Main App</p>
            {connected ? <p>Connected</p> : <p>Connecting...</p>}
            {registered ? <p>Registered</p> : <p>Registering...</p>}
            <button onClick={unregister}>Unregister</button>
            {unregistered && <p>Unregistered</p>}
            <div>
                <button onClick={createMeeting}>Create a Meeting</button>
                {meetingObject && <p>{meetingObject.id} {meetingObject.meetingNumber} {meetingObject.phoneAndVideoSystemPassword} </p>}
            </div>
            <div>
                <button onClick={joinMeeting}>Join</button>
            </div>
            <div>
                {meetingCurrentDetails && <p>{meetingCurrentDetails}</p>}
                <button onClick={leaveMeeting}>Leave</button>
            </div>
            <div className="video" style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', width: '100%' }}>
                <div style={{ width: '40%', height: '15vh', padding:'2rem' }}>
                    <fieldset>
                        <legend>Local Video</legend>
                        <video width='100%' height='100%' className='localstream' id='localstream' ref={localStreamRef} autoPlay playsInline></video>
                    </fieldset>
                </div>
                <div style={{ width: '40%', height: '15vh',padding:'2rem' }}>
                    <fieldset>
                        <legend>Remote Video</legend>
                        <video width='100%' height='100%' className='remotestreamvideo' id='remotestreamvideo' ref={remoteStreamVideoRef} autoPlay playsInline></video>
                        <audio className='remotestreamaudio' id='remotestreamaudio' ref={remoteStreamAudioRef} autoPlay></audio>
                    </fieldset>
                </div>
            </div>
        </div>
    )
}

/*
{
  "id": "Y2lzY29zcGFyazovL3VybjpURUFNOnVzLXdlc3QtMl9yL1RFQU0vOThjYzA3YjAtMTIyOS0xMWVjLWE3MjAtZTkyNTZlNDgxNjBh",
  "name": "Test-Team",
  "creatorId": "Y2lzY29zcGFyazovL3VzL1BFT1BMRS8xMjgzNzM2YS0wMjNiLTRmYzQtYTgxMC05OWEzZWU2NGNiNzU",
  "created": "2021-09-10T11:24:00.811Z"
}

{
  "id": "Y2lzY29zcGFyazovL3VybjpURUFNOnVzLXdlc3QtMl9yL1JPT00vMzgwOWRlNjAtMTIyYS0xMWVjLWEzMmEtMTNkMTllZGQ0NmUw",
  "title": "Test-Room",
  "type": "group",
  "isLocked": false,
  "lastActivity": "2021-09-10T11:28:27.982Z",
  "teamId": "Y2lzY29zcGFyazovL3VybjpURUFNOnVzLXdlc3QtMl9yL1RFQU0vOThjYzA3YjAtMTIyOS0xMWVjLWE3MjAtZTkyNTZlNDgxNjBh",
  "creatorId": "Y2lzY29zcGFyazovL3VzL1BFT1BMRS8xMjgzNzM2YS0wMjNiLTRmYzQtYTgxMC05OWEzZWU2NGNiNzU",
  "created": "2021-09-10T11:28:27.982Z",
  "ownerId": "Y2lzY29zcGFyazovL3VzL09SR0FOSVpBVElPTi9hNzAxMmEzNi1hMjc4LTRiNjktOTI5ZS1lYzVjYzdiODZkMTc"
}

*/