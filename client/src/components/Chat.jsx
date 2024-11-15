import React, { useEffect, useState } from "react";
import {
    MDBContainer,
    MDBRow,
    MDBCol,
    MDBCard,
    MDBCardBody,
    MDBIcon,
    MDBTypography,
    MDBInputGroup,
    MDBBtn,
} from "mdb-react-ui-kit";
import moment from 'moment';
import { deleteMsgById, fileUploading, getAllUsers, getMsgBysenderId } from "../services/api";
import { setupSocket, sendMessage, sendFile, socket } from "../services/socket";
import getUserInfo from "../services/jwtDecod";
import { useNavigate } from 'react-router-dom';
import { useSocket } from "../services/SocketContext";


const Chat = () => {
    const [allUserData, setAllUserData] = useState([]);
    const [messages, setMessages] = useState([]);
    const [currentMessage, setCurrentMessage] = useState("");
    const [currentUserId, setCurrentUserId] = useState("");
    const [currentUserName, setCurrentUserName] = useState("");
    const [update, setUpdate] = useState(false);

    const [updateData, setUpdateData] = useState(false);
    const [file, setFile] = useState(null);
    const { user } = getUserInfo();
    const navigate = useNavigate();
    const { setCallerSignalData } = useSocket();

    // Fetch all users and set up socket connection once
    useEffect(() => {
        (async () => {
            const { data } = await getAllUsers(user._id);
            setAllUserData(data);
            // console.log(data);
            if (!update) {
                setCurrentUserId(data?.userData[0]?._id);
                setCurrentUserName(data?.userData[0]?.fullName);
            }

        })();
        setupSocket({
            senderId: user._id,
            receiverId: currentUserId,
        });

        // Set up listeners for incoming messages
        const handleReceiveMessage = (message) => {
            // console.log(message, "messages from socket");
            setMessages(message);
            setUpdateData((prevStatew) => !prevStatew);
        };

        const handleReceiveFile = (fileData) => {
            setMessages(fileData);
            setUpdateData((prevStatew) => !prevStatew);
        };
        const handlePreviesMsg = (preMsg) => {
            setMessages(preMsg);
            setUpdateData((prevStatew) => !prevStatew);
        };
        const callingNotification = (data) => {
            setCallerSignalData(data);
            const roomId = [user._id, currentUserId].sort().join("-");
            navigate(`/video-call/${roomId}`);
        };

        // Attach socket listeners
        socket.on("receiveMessage", handleReceiveMessage);
        socket.on("receiveFile", handleReceiveFile);
        socket.on("previousMessages", handleReceiveFile);
        socket.on("disconnect-user", () => {
            setUpdateData((prevStatew) => !prevStatew);
        });
        socket.on('callUser', callingNotification);


        return () => {
            socket.off("receiveMessage", handleReceiveMessage);
            socket.off("receiveFile", handleReceiveFile);
            socket.off("previousMessages", handlePreviesMsg);
            socket.off("disconnect-user", () => {
                setUpdateData((prevStatew) => !prevStatew);
            });
            socket.off("callUser", callingNotification);
        };
    }, [user._id, currentUserId, update]);

    // Fetch messages each time the current user changes
    useEffect(() => {
        if (currentUserId) {
            (async () => {
                const res = await getMsgBysenderId({
                    senderId: user._id,
                    receiverId: currentUserId,
                });
                setMessages(res.data);
            })();
        }
    }, [currentUserId, updateData]);

    const handleSendMessage = async () => {
        if (currentMessage.trim()) {
            const messageData = { content: currentMessage, senderId: user._id, receiverId: currentUserId };
            sendMessage(messageData);
            // setMessages((prevMessages) => [...prevMessages, messageData]);
            setCurrentMessage("");
        }

        if (!file) {
            return;
        }
        const formData = new FormData();
        formData.append('file', file); // 'file' matches the backend field name
        try {
            const response = await fileUploading(formData);

            sendFile({ senderId: user._id, receiverId: currentUserId, fileName: file.name, fileUrl: response.data.fileUrl, fileType: file.type });
            setFile(null);

            // console.log('File uploaded successfully:', response.data);
        } catch (error) {
            console.error('Error uploading file:', error);
        }

    };
    const handleFileUpload = (e) => {
        const uploadedFile = e.target.files[0];
        // console.log(uploadedFile);
        if (uploadedFile) {
            setFile(uploadedFile);
        }

    };
    const handleCalling = () => {
        const roomId = [user._id, currentUserId].sort().join("-");

        navigate(`/video-call/${roomId}`);
    };
    // console.log(currentUserId);

    const handleLogOut = () => {
        localStorage.removeItem("token");
        navigate("/login");
    };
    const handleDelete = async (id) => {
        // console.log("deleteing...", id);
        await deleteMsgById(id);
        setUpdateData((prevStatew) => !prevStatew);
        // console.log(resDelete);

    };
    // console.log(allUserData);
    return (
        <MDBContainer fluid className="py-5" style={{ backgroundColor: "#CDC4F9" }}>
            <MDBRow>
                <MDBCol md="12">
                    <MDBCard id="chat3" style={{ borderRadius: "15px" }}>
                        <MDBCardBody>
                            <h4>{user.fullName}</h4>
                            <MDBRow>
                                <MDBCol md="6" lg="5" xl="4" className="mb-4 mb-md-0">
                                    <div className="p-3">
                                        <MDBInputGroup className="rounded mb-3">
                                            <input
                                                className="form-control rounded"
                                                placeholder="Search"
                                                type="search"
                                            />
                                            <span className="input-group-text border-0" id="search-addon">
                                                <MDBIcon fas icon="search" />
                                            </span>
                                        </MDBInputGroup>
                                        <MDBTypography listUnStyled className="mb-0">
                                            {allUserData?.userData?.map((data, index) => (
                                                <li
                                                    className="p-2 border-bottom"
                                                    key={index}
                                                    onClick={() => {
                                                        setCurrentUserName(data.fullName);
                                                        setCurrentUserId(data._id);
                                                        // setMessages([]);
                                                        setUpdate(true);
                                                    }}
                                                >
                                                    <a href="#!" className="d-flex justify-content-between">
                                                        <div className="d-flex flex-row">
                                                            <img
                                                                src="https://mdbcdn.b-cdn.net/img/Photos/new-templates/bootstrap-chat/ava1-bg.webp"
                                                                alt="avatar"
                                                                className="d-flex align-self-center me-3"
                                                                width="60"
                                                            />
                                                            <div className="pt-1">
                                                                <p className="fw-bold mb-0">{data.fullName}</p>

                                                                {/* <p className="small text-muted">{data.lastMessage}</p> */}
                                                                <p>{data.isActive ? "online" : <span>{moment(data.updatedAt).startOf('hour').fromNow()}</span>}</p>
                                                            </div>
                                                        </div>
                                                    </a>
                                                </li>
                                            ))}
                                        </MDBTypography>
                                    </div>
                                </MDBCol>
                                <MDBCol md="6" lg="7" xl="8">
                                    <div className="pt-3 pe-3">
                                        <h4>{currentUserName}</h4>
                                        {messages?.data?.length > 0 ? (
                                            messages.data.map((message, index) => (
                                                <div key={index}>
                                                    <div>
                                                        <p>
                                                            <b>{message.senderId.fullName}</b>
                                                            <span> {moment(message.createdAt).format('MMMM Do YYYY, h:mm:ss a')}</span>
                                                        </p>
                                                        <p
                                                            className="small p-2 me-3 mb-1 rounded-3"
                                                            style={{
                                                                backgroundColor: "#f5f6f7",
                                                                color: "#000"
                                                            }}
                                                        >
                                                            {/* Display text messages */}
                                                            {message.messageType === "text" && message.content}

                                                            {/* Display PDF files */}
                                                            {message.messageType === "application/pdf" && (
                                                                <a href={message.fileUrl} target="_blank" rel="noopener noreferrer" download>
                                                                    {message.content}
                                                                </a>
                                                            )}

                                                            {/* Display images */}
                                                            {message.messageType.startsWith("image/") && message.fileUrl && (
                                                                <img src={message.fileUrl} alt="file" style={{ maxWidth: "100%", height: "auto" }} />
                                                            )}

                                                            {/* Display audio files */}
                                                            {message.messageType.startsWith("audio/") && message.fileUrl && (
                                                                <audio controls>
                                                                    <source src={message.fileUrl} type={message.messageType} />
                                                                    Your browser does not support the audio element.
                                                                </audio>
                                                            )}

                                                            {/* Display video files */}
                                                            {message.messageType.startsWith("video/") && message.fileUrl && (
                                                                <video controls style={{ maxWidth: "100%" }}>
                                                                    <source src={message.fileUrl} type={message.messageType} />
                                                                    Your browser does not support the video element.
                                                                </video>
                                                            )}
                                                        </p>

                                                        <MDBBtn onClick={() => handleDelete(message._id)}>delete</MDBBtn>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <p>Message not available</p>
                                        )}


                                    </div>
                                    <div className="text-muted d-flex justify-content-start align-items-center pe-3 pt-3 mt-2">
                                        <input
                                            type="text"
                                            className="form-control form-control-lg"
                                            placeholder="Type message"
                                            value={currentMessage}
                                            onChange={(e) => setCurrentMessage(e.target.value)}
                                            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                                        />
                                        <a className="ms-1 text-muted" href="#!" onClick={handleSendMessage}>
                                            <MDBIcon fas icon="paper-plane" />
                                        </a>


                                    </div>
                                    <input
                                        type="file"
                                        accept=".pdf, image/*, audio/mpeg, video/*"
                                        className="form-control form-control-lg"
                                        placeholder="Type message"
                                        onChange={(e) => handleFileUpload(e)}
                                    />


                                    <MDBBtn onClick={() => handleCalling()} >call</MDBBtn>
                                </MDBCol>
                            </MDBRow>
                        </MDBCardBody>
                    </MDBCard>
                </MDBCol>
            </MDBRow>
            <MDBBtn onClick={() => handleLogOut()} >LogOut</MDBBtn>
        </MDBContainer>
    );
};

export default Chat;
