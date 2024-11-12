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
} from "mdb-react-ui-kit";
import { getAllUsers } from "../services/api";
import { setupSocket, sendMessage, sendFile, socket } from "../services/socket";
import getUserInfo from "../services/jwtDecod";

const Chat = () => {
    const [allUserData, setAllUserData] = useState([]);
    const [messages, setMessages] = useState([]);
    const [currentMessage, setCurrentMessage] = useState("");
    const { user } = getUserInfo();

    useEffect(() => {
        (async () => {
            const { data } = await getAllUsers();
            setAllUserData(data);
        })();


        const userId = user._id;
        setupSocket(userId);

        // Set up listeners for incoming messages
        const handleReceiveMessage = (message) => {
            setMessages((prevMessages) => [...prevMessages, message]);
        };

        const handleReceiveFile = (fileData) => {
            console.log("Received file:", fileData);
        };

        // Socket.io listeners for messages and file uploads
        socket.on("receiveMessage", handleReceiveMessage);
        socket.on("receiveFile", handleReceiveFile);

        // Cleanup listeners on component unmount
        return () => {
            socket.off("receiveMessage", handleReceiveMessage);
            socket.off("receiveFile", handleReceiveFile);
        };
    }, []);

    const handleSendMessage = () => {
        if (currentMessage.trim()) {
            sendMessage({ content: currentMessage, senderId: user._id });
            setMessages([...messages, { content: currentMessage, senderId: user._id }]);
            setCurrentMessage("");
        }
    };

    return (
        <MDBContainer fluid className="py-5" style={{ backgroundColor: "#CDC4F9" }}>
            <MDBRow>
                <MDBCol md="12">
                    <MDBCard id="chat3" style={{ borderRadius: "15px" }}>
                        <MDBCardBody>
                            <MDBRow>
                                <MDBCol md="6" lg="5" xl="4" className="mb-4 mb-md-0">
                                    <div className="p-3">
                                        <MDBInputGroup className="rounded mb-3">
                                            <input
                                                className="form-control rounded"
                                                placeholder="Search"
                                                type="search"
                                            />
                                            <span
                                                className="input-group-text border-0"
                                                id="search-addon"
                                            >
                                                <MDBIcon fas icon="search" />
                                            </span>
                                        </MDBInputGroup>
                                        <MDBTypography listUnStyled className="mb-0">
                                            {allUserData?.userData?.map((data, index) => (
                                                <li className="p-2 border-bottom" key={index}>
                                                    <a
                                                        href="#!"
                                                        className="d-flex justify-content-between"
                                                    >
                                                        <div className="d-flex flex-row">
                                                            <img
                                                                src="https://mdbcdn.b-cdn.net/img/Photos/new-templates/bootstrap-chat/ava1-bg.webp"
                                                                alt="avatar"
                                                                className="d-flex align-self-center me-3"
                                                                width="60"
                                                            />
                                                            <div className="pt-1">
                                                                <p className="fw-bold mb-0">
                                                                    {data.fullName}
                                                                </p>
                                                                <p className="small text-muted">
                                                                    Hello, Are you there?
                                                                </p>
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
                                        {messages.map((message, index) => (
                                            <div
                                                key={index}
                                                className={`d-flex ${message.senderId === "currentUserId"
                                                    ? "justify-content-end"
                                                    : "justify-content-start"
                                                    }`}
                                            >
                                                <div>
                                                    <p
                                                        className="small p-2 me-3 mb-1 rounded-3"
                                                        style={{
                                                            backgroundColor:
                                                                message.senderId === "currentUserId"
                                                                    ? "#007bff"
                                                                    : "#f5f6f7",
                                                            color:
                                                                message.senderId === "currentUserId"
                                                                    ? "#fff"
                                                                    : "#000",
                                                        }}
                                                    >
                                                        {message.content}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
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
                                </MDBCol>
                            </MDBRow>
                        </MDBCardBody>
                    </MDBCard>
                </MDBCol>
            </MDBRow>
        </MDBContainer>
    );
};

export default Chat;
