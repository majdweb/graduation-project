import React, {
  useState
} from 'react'
import {
  Link,
  useLocation,
  useNavigate
} from 'react-router-dom'
import './room.css'

export default function Rooms() {
  const [rooms] = useState([{
      id: 1,
      name: 'Deluxe King Room',
      hotel: 'Blue Horizon Hotel',
      city: 'Paris',
      price: 120,
      rating: 5,
      img: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=900&q=80',
    },
    {
      id: 2,
      name: 'Modern Suite',
      hotel: 'Royal Stay',
      city: 'London',
      price: 180,
      rating: 4,
      img: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=80',
    },
    {
      id: 3,
      name: 'Cozy Double Room',
      hotel: 'Sunset Inn',
      city: 'Rome',
      price: 90,
      rating: 4,
      img: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=900&q=80',
    },
    {
      id: 4,
      name: 'Luxury Suite',
      hotel: 'Velvet Palace',
      city: 'Dubai',
      price: 250,
      rating: 5,
      img: 'https://images.unsplash.com/photo-1505691723518-36a5ac3be353?auto=format&fit=crop&w=900&q=80',
    },
  ])

  const [recommended] = useState([{
      id: 101,
      name: 'Premium Sea View',
      hotel: 'Ocean Breeze Resort',
      price: 200,
      rating: 5,
      img: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=900&q=80',
    },
    {
      id: 102,
      name: 'Executive Suite',
      hotel: 'Grand Palace',
      price: 260,
      rating: 5,
      img: 'https://images.unsplash.com/photo-1505691723518-36a5ac3be353?auto=format&fit=crop&w=900&q=80',
    },
    {
      id: 103,
      name: 'Romantic Getaway',
      hotel: 'Velvet Rose Hotel',
      price: 180,
      rating: 4,
      img: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=900&q=80',
    },
  ])

  const location = useLocation()
  const navigate = useNavigate()
  const incoming = location.state || {}
  const selectedHotel = incoming.selectedHotel || ''

  const [filters, setFilters] = useState({
    roomName: '',
    checkIn: incoming.checkIn || '',
    checkOut: incoming.checkOut || '',
  })

  const [priceRange, setPriceRange] = useState([0, 300])

  const handleMin = (e) => {
    const v = Number(e.target.value)
    if (v <= priceRange[1]) setPriceRange([v, priceRange[1]])
  }

  const handleMax = (e) => {
    const v = Number(e.target.value)
    if (v >= priceRange[0]) setPriceRange([priceRange[0], v])
  }

  const filteredRooms = rooms.filter((room) => {
    const matchesHotel = selectedHotel ?
      room.hotel.toLowerCase() === selectedHotel.toLowerCase() :
      true

    const matchesRoomName =
      filters.roomName === '' ||
      room.name.toLowerCase().includes(filters.roomName.toLowerCase())

    const matchesPrice = room.price >= priceRange[0] && room.price <= priceRange[1]

    return matchesHotel && matchesRoomName && matchesPrice
  })

  return ( <
    div className = "rooms-page" >
    <
    div className = "back-wrapper" >
    <
    Link to = "/"
    className = "back-btn" > ←Back < /Link> <
    /div>

    <
    h2 className = "section-title" > Recommended Rooms < /h2>

    <
    div className = "recommended-grid" > {
      recommended.map((room) => ( <
        div className = "recommended-card snow-card"
        key = {
          room.id
        } >
        <
        img src = {
          room.img
        }
        className = "recommended-img"
        alt = {
          room.name
        }
        /> <
        h3 > {
          room.name
        } < /h3> <
        p className = "hotel-name" > {
          room.hotel
        } < /p> <
        div className = "room-info" >
        <
        span className = "price" > $ {
          room.price
        }
        /night</span >
        <
        span className = "stars" > {
          '★'.repeat(room.rating)
        } < /span> <
        /div> <
        Link to = "/reservation"
        state = {
          {
            room
          }
        }
        className = "book-btn" >
        Book Now <
        /Link> <
        /div>
      ))
    } <
    /div>

    <
    div className = "rooms-header-row" >
    <
    h1 className = "section-title" > {
      selectedHotel ? `Available Rooms at ${selectedHotel}` : 'Available Rooms'
    } <
    /h1> {
      selectedHotel && ( <
        button className = "secondary-btn"
        onClick = {
          () => navigate('/hotels')
        } >
        Change Hotel <
        /button>
      )
    } <
    /div>

    <
    div className = "filters-wrapper" >
    <
    div className = "filters-row" > {
      selectedHotel && ( <
        div className = "selected-hotel" >
        Selected hotel: < strong > {
          selectedHotel
        } < /strong> <
        /div>
      )
    } <
    input type = "text"
    placeholder = "Room Name"
    value = {
      filters.roomName
    }
    onChange = {
      (e) => setFilters({
        ...filters,
        roomName: e.target.value
      })
    }
    /> <
    /div>

    <
    div className = "filters-row advanced-row" >
    <
    div className = "simple-range" >
    <
    h3 > Price Range < /h3> <
    input type = "range"
    min = "0"
    max = "300"
    value = {
      priceRange[0]
    }
    onChange = {
      handleMin
    }
    /> <
    input type = "range"
    min = "0"
    max = "300"
    value = {
      priceRange[1]
    }
    onChange = {
      handleMax
    }
    /> <
    div className = "simple-values" >
    <
    span > $ {
      priceRange[0]
    } < /span> <
    span > $ {
      priceRange[1]
    } < /span> <
    /div> <
    /div>

    <
    div className = "date-fields" >
    <
    label >
    Check In <
    input type = "date"
    value = {
      filters.checkIn
    }
    onChange = {
      (e) => setFilters({
        ...filters,
        checkIn: e.target.value
      })
    }
    /> <
    /label> <
    label >
    Check Out <
    input type = "date"
    value = {
      filters.checkOut
    }
    onChange = {
      (e) => setFilters({
        ...filters,
        checkOut: e.target.value
      })
    }
    /> <
    /label> <
    /div> <
    /div> <
    /div>

    <
    div className = "rooms-grid" > {
      filteredRooms.length > 0 ? (
        filteredRooms.map((room) => ( <
          div className = "room-card snow-card"
          key = {
            room.id
          } >
          <
          img src = {
            room.img
          }
          className = "room-img"
          alt = {
            room.name
          }
          /> <
          h3 > {
            room.name
          } < /h3> <
          p className = "hotel-name" > {
            room.hotel
          } < /p> <
          p className = "city" > {
            room.city
          } < /p> <
          div className = "room-info" >
          <
          span className = "price" > $ {
            room.price
          }
          /night</span >
          <
          span className = "stars" > {
            '★'.repeat(room.rating)
          } < /span> <
          /div> <
          Link to = "/reservation"
          state = {
            {
              room
            }
          }
          className = "book-btn" >
          Book Now <
          /Link> <
          /div>
        ))
      ) : ( <
        div className = "empty-state" >
        <
        p > No rooms found
        for this hotel and filters. < /p> <
        button className = "secondary-btn"
        onClick = {
          () => navigate('/hotels')
        } >
        Choose another hotel <
        /button> <
        /div>
      )
    } <
    /div> <
    /div>
  )
}