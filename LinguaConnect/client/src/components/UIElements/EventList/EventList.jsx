import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  selectUserEvents,
  setUserEvents,
  updateEvent,
  deleteEvent,
  removeEventFromUserList,
} from "../../../slices/eventSlice";
import { addAlert } from "../../../slices/alertSlice";
import axios from "axios";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardActionArea from "@mui/material/CardActionArea";
import Typography from "@mui/material/Typography";
import Modal from "@mui/material/Modal";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Avatar from "@mui/material/Avatar";
import EventEditForm from "../../FormElements/EventEditForm/EventEditForm";

export const EventList = ({ selectedCategory, userId }) => {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [openModal, setOpenModal] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const events = useSelector(selectUserEvents);

  // Fetch events related to the current user from API
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await axios.get(
          `http://localhost:3000/api/v1/events/user/${userId}`,
          { withCredentials: true }
        );
        let fetchedEvents = response.data.data.events;
        // Sort events by date
        if (fetchedEvents) {
          fetchedEvents.sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
          );
          dispatch(setUserEvents(fetchedEvents));
        }
      } catch (error) {
        console.error("Error fetching events:", error);
      }
    };

    if (userId) {
      fetchEvents();
    }
  }, [userId, dispatch]);

  // Filter events by category
  const filteredEvents = events.filter(
    (event) =>
      event.relationship &&
      event.relationship.toLowerCase() === selectedCategory.toLowerCase()
  );

  // Function to handle menu open
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  // Function to handle menu close
  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  // Function to handle edit option
  const handleEdit = () => {
    setIsEditMode(true);
    handleCloseMenu();
  };

  // Function to handle delete option
  const handleDelete = () => {
    setShowDeleteConfirm(true);
    handleCloseMenu();
  };

  // Function to handle remove option
  const handleRemove = () => {
    setShowRemoveConfirm(true);
    handleCloseMenu();
  };

  // Function to confirm deletion of event
  const handleConfirmDelete = async () => {
    try {
      await axios.delete(
        `http://localhost:3000/api/v1/events/${selectedEvent._id}`,
        {
          withCredentials: true,
        }
      );
      dispatch(deleteEvent(selectedEvent._id));
      dispatch(
        addAlert({
          message: "Event deleted successfully",
          type: "success",
        })
      );
      setShowDeleteConfirm(false);
      setOpenModal(false);
    } catch (error) {
      console.error("Error deleting event:", error);
    }
  };

  // Function to confirm removal of event from user's list
  const handleConfirmRemove = async () => {
    const eventId = selectedEvent._id;
    try {
      await axios.delete(
        `http://localhost:3000/api/v1/events/removeEvent/${eventId}`,
        {
          withCredentials: true,
        }
      );
      dispatch(removeEventFromUserList(eventId));

      dispatch(
        addAlert({
          message: "Event removed from your list successfully",
          type: "success",
        })
      );
      setOpenModal(false);
    } catch (error) {
      console.error("Error removing event:", error);
    }
  };

  // Function to truncate strings
  const truncateString = (str, num) => {
    if (str.length <= num) return str;
    return str.slice(0, num) + "...";
  };

  // Function to format date for display
  function formatDateForDisplay(dateString) {
    const [year, month, day] = dateString.split("T")[0].split("-");
    const date = new Date(Date.UTC(year, month - 1, day));
    const options = {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    };

    return date.toLocaleDateString("en-US", options);
  }

  // Format Time to 12-hour format with AM/PM
  const formatTime = (timeString) => {
    const [hours, minutes] = timeString.split(":");
    const hoursIn12HourFormat = ((parseInt(hours) + 11) % 12) + 1;
    const amPm = hours >= 12 ? "PM" : "AM";
    return `${hoursIn12HourFormat}:${minutes} ${amPm}`;
  };

  return (
    <>
      <List
        sx={{
          width: "100%",
          maxHeight: "calc(100vh - 227.5px)",
          overflowY: "auto",
        }}
      >
        {filteredEvents.map((event, index) => (
          <ListItem key={index} disablePadding>
            <CardActionArea
              onClick={() => {
                setSelectedEvent(event);
                setOpenModal(true);
              }}
            >
              <Card sx={{ margin: 2 }}>
                <CardContent>
                  <Typography variant="h6" component="div">
                    {truncateString(event.title, 50)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {truncateString(event.description, 100)}
                  </Typography>
                </CardContent>
              </Card>
            </CardActionArea>
          </ListItem>
        ))}
      </List>

      {selectedEvent && (
        <Modal
          open={openModal}
          onClose={() => setOpenModal(false)}
          aria-labelledby="modal-modal-title"
          aria-describedby="modal-modal-description"
        >
          <Box
            sx={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              maxWidth: 1300,
              maxHeight: 1200,
              bgcolor: "background.paper",
              border: "2px solid #000",
              borderRadius: 1,
              boxShadow: 24,
              p: 4,
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography
                id="modal-modal-title"
                variant="h6"
                component="h2"
                sx={{ fontWeight: "bold" }}
              >
                {selectedEvent.title}
              </Typography>
              <IconButton
                aria-controls="event-menu"
                aria-haspopup="true"
                onClick={handleMenuOpen}
              >
                <MoreVertIcon />
              </IconButton>
            </Box>
            <Menu
              id="event-menu"
              anchorEl={anchorEl}
              keepMounted
              open={Boolean(anchorEl)}
              onClose={handleCloseMenu}
              sx={{ transform: "translateX(-70px)" }}
            >
              {selectedEvent.relationship === "created" && (
                <MenuItem onClick={handleEdit}>Edit</MenuItem>
              )}
              {selectedEvent.relationship === "created" && (
                <MenuItem onClick={handleDelete}>Delete</MenuItem>
              )}
              {selectedEvent.relationship !== "created" && (
                <MenuItem onClick={handleRemove}>Remove</MenuItem>
              )}
            </Menu>
            <Typography sx={{ mt: 2 }}>{selectedEvent.description}</Typography>
            <Typography sx={{ mt: 2, fontWeight: "bold" }}>
              Date: {formatDateForDisplay(selectedEvent.date)}
            </Typography>
            <Typography sx={{ mt: 2, fontWeight: "bold" }}>
              Time: {formatTime(selectedEvent.time)}
            </Typography>
            <Typography sx={{ mt: 2, fontWeight: "bold" }}>
              Languages:{" "}
              {selectedEvent.languages.map((lang) => lang.name).join(", ")}
            </Typography>
            <Typography sx={{ mt: 2, fontWeight: "bold" }}>
              Location: {selectedEvent.location.address}
            </Typography>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                mt: 2,
              }}
            >
              <Typography sx={{ mr: 1, fontWeight: "bold" }}>
                Hosted by:
              </Typography>
              <Avatar
                alt="Creator's Profile Picture"
                src={selectedEvent.createdBy.profilePicture.url}
                onClick={() =>
                  navigate(`/profile/${selectedEvent.createdBy._id}`)
                }
                sx={{
                  width: 56,
                  height: 56,
                  cursor: "pointer",
                }}
              />
            </Box>
          </Box>
        </Modal>
      )}

      {/* Edit Event Modal */}
      {isEditMode && (
        <Modal
          open={isEditMode}
          onClose={() => setIsEditMode(false)}
          aria-labelledby="edit-event-modal-title"
        >
          <Box
            sx={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 600,
              bgcolor: "background.paper",
              border: "2px solid #000",
              borderRadius: 1,
              boxShadow: 24,
              p: 4,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <EventEditForm
              eventId={selectedEvent._id}
              onClose={() => setIsEditMode(false)}
              onUpdate={(updatedEvent) => {
                dispatch(updateEvent(updatedEvent));
                setIsEditMode(false);
                setOpenModal(false);
              }}
            />
          </Box>
        </Modal>
      )}
      {/* Delete Confirmation Modal */}
      <Modal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
      >
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            maxWidth: 800,
            maxHeight: 800,
            bgcolor: "background.paper",
            border: "2px solid #000",
            borderRadius: 1,
            boxShadow: 24,
            p: 4,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography>Are you sure you want to delete this event?</Typography>
          <Box
            sx={{ mt: 4, display: "flex", justifyContent: "center", gap: 2 }}
          >
            <Button
              variant="contained"
              color="error"
              onClick={() => setShowDeleteConfirm(false)}
              sx={{ width: "130px" }}
            >
              NO
            </Button>
            <Button
              variant="contained"
              color="success"
              onClick={handleConfirmDelete}
              sx={{ width: "130px" }}
            >
              YES
            </Button>
          </Box>
        </Box>
      </Modal>

      {/* Remove Confirmation Modal */}
      <Modal
        open={showRemoveConfirm}
        onClose={() => setShowRemoveConfirm(false)}
      >
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            maxWidth: 800,
            maxHeight: 800,
            bgcolor: "background.paper",
            border: "2px solid #000",
            borderRadius: 1,
            boxShadow: 24,
            p: 4,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography>
            Are you sure you want to remove this event from your list?
          </Typography>
          <Box
            sx={{ mt: 4, display: "flex", justifyContent: "center", gap: 2 }}
          >
            <Button
              variant="contained"
              color="error"
              onClick={() => setShowRemoveConfirm(false)}
              sx={{ width: "130px" }}
            >
              NO
            </Button>
            <Button
              variant="contained"
              color="success"
              onClick={() => {
                handleConfirmRemove();
                setShowRemoveConfirm(false);
              }}
              sx={{ width: "130px" }}
            >
              YES
            </Button>
          </Box>
        </Box>
      </Modal>
    </>
  );
};

export default EventList;
