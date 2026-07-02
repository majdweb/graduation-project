import React from 'react'
import { useNavigate } from 'react-router-dom'
import { getCurrentRole } from './services/auth'
import './about.css'

const team = [
    {
        name: 'Alice Johnson',
        role: 'Frontend Developer',
        contribution: 'Built the React UI, components, and responsive layout.',
        img: 'https://i.pravatar.cc/300?img=10'
    },
    {
        name: 'Mohamed Karim',
        role: 'Backend Developer',
        contribution: 'Designed API endpoints and mock server integration.',
        img: 'https://i.pravatar.cc/300?img=12'
    },
    {
        name: 'Sara Ahmed',
        role: 'UI/UX Designer',
        contribution: 'Designed visuals, icons, and user flows.',
        img: 'https://i.pravatar.cc/300?img=14'
    },
    {
        name: 'Omar Ali',
        role: 'Fullstack Developer',
        contribution: 'Implemented authentication and state management.',
        img: 'https://i.pravatar.cc/300?img=16'
    },
    {
        name: 'Lina Bassam',
        role: 'QA & Tester',
        contribution: 'Wrote tests and validated cross-browser compatibility.',
        img: 'https://i.pravatar.cc/300?img=18'
    },
    {
        name: 'Yousef Nabil',
        role: 'Project Manager',
        contribution: 'Coordinated the team and managed milestones.',
        img: 'https://i.pravatar.cc/300?img=20'
    }
]

export default function AboutUs() {
    const navigate = useNavigate()
    const isOwner = getCurrentRole() === 'hotel_owner'
    const handleBack = () => {
        const fallback = isOwner ? '/ownerhome' : '/'
        if (window.history.length > 1) {
            navigate(-1)
        } else {
            navigate(fallback, { replace: true })
        }
    }
    return (
        <section className="about-section">
            <div className="about-header">
                <button type="button" className="back-link" onClick={handleBack}>← Back</button>
                <div className="page-heading">
                    <h2 className="about-title">About Us</h2>
                    <p className="about-subtitle">Six team members who built this project together.</p>
                </div>
            </div>

            <div className="team-grid">
                {team.map((member, idx) => (
                    <article className="card" key={idx} tabIndex={0} aria-label={`Team member ${member.name}`}>
                        <div className="card-inner">
                            <div className="card-front">
                                <img src={member.img} alt={`${member.name} avatar`} className="avatar" />
                                <div className="front-info">
                                    <h3 className="member-name">{member.name}</h3>
                                    <p className="member-role">{member.role}</p>
                                </div>
                            </div>
                            <div className="card-back">
                                <h3 className="member-name">{member.name}</h3>
                                <p className="member-role">{member.role}</p>
                                <p className="member-contrib">{member.contribution}</p>
                            </div>
                        </div>
                    </article>
                ))}
            </div>
        </section>
    )
}
