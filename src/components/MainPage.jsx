import { useState } from "react"
import App from "./App"
import JoinMeeting from "./JoinMeeting"

export default function MainPage() {
    const [currentPage, setCurrentPage] = useState(0)
    return (
        <div>
            <button onClick={() => setCurrentPage(1)}>Create a Meeting</button>
            <button onClick={() => setCurrentPage(2)}>Join a Meeting</button>
            <div className="display" style={{ marginTop: '3rem' }}>
                {currentPage === 1 ? <App /> : currentPage === 2 ? <JoinMeeting /> : <p>Nothing yet</p>}
            </div>
        </div>
    )
}