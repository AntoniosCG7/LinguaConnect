import React, { useState, useEffect } from "react";
import "./ProfileCreationForm.css";

import Select from "react-select";

function ProfileCreationForm() {
  const [profilePicture, setProfilePicture] = useState(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nativeLanguage, setNativeLanguage] = useState([]);
  const [fluentLanguages, setFluentLanguages] = useState([]);
  const [learningLanguages, setLearningLanguages] = useState([]);
  const [talkAbout, setTalkAbout] = useState("");
  const [perfectPartner, setPerfectPartner] = useState("");
  const [learningGoals, setLearningGoals] = useState("");
  const [photos, setPhotos] = useState([]);
  const [availableLanguages, setAvailableLanguages] = useState([]);
  const languageOptions = availableLanguages.map((lang) => ({
    value: lang,
    label: lang,
  }));

  // Using the useEffect hook to fetch languages when the component mounts
  useEffect(() => {
    fetch("http://localhost:3000/api/v1/languages")
      .then((response) => response.json())
      .then((data) => {
        const languageNames = data.map((language) => language.name);
        setAvailableLanguages(languageNames);
      })
      .catch((error) => {
        console.error("Error fetching languages:", error);
      });
  }, []); // The empty dependency array ensures this useEffect runs once when the component mounts

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();

    // Create a FormData object to send form data
    const formData = new FormData();
    formData.append("profilePicture", profilePicture);
    formData.append("firstName", firstName);
    formData.append("lastName", lastName);
    formData.append("nativeLanguage", nativeLanguage);
    formData.append("fluentLanguages", fluentLanguages);
    formData.append("learningLanguages", learningLanguages);
    formData.append("talkAbout", talkAbout);
    formData.append("perfectPartner", perfectPartner);
    formData.append("learningGoals", learningGoals);
    for (let i = 0; i < photos.length; i++) {
      formData.append("photos", photos[i]);
    }

    // Log the form data for debugging purposes
    for (let pair of formData.entries()) {
      console.log(pair[0] + ": " + pair[1]);
    }

    // Send formData to the server for processing (via a POST request)
    // fetch("http://localhost:3000/api/v1/createProfile", {
    //   method: "POST",
    //   body: formData,
    // })
    //   .then((response) => response.json())
    //   .then((data) => {
    //     console.log("Success:", data);
    //     // Redirect to the profile page
    //     window.location.href = "/profile";
    //   })
    //   .catch((error) => {
    //     console.error("Error:", error);
    //   });

    // Maybe I should use libraries like Axios to make the HTTP request.
    // axios.post('/api/createProfile', formData).then(response => { ... });
  };

  const customStyles = {
    control: (base) => ({
      ...base,
      border: "3px solid var(--primary-color)",
      boxShadow: "none",
      "&:hover": {
        borderColor: "var(--primary-color)",
      },
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected
        ? "var(--primary-color)"
        : state.isFocused
        ? "var(--primary-color)"
        : null,
      cursor: "pointer",
    }),
    multiValue: (base) => ({
      ...base,
      backgroundColor: "var(--primary-color)",
    }),
    multiValueLabel: (base) => ({
      ...base,
    }),
    multiValueRemove: (base) => ({
      ...base,
      color: "black",
      ":hover": {
        backgroundColor: "red",
        cursor: "pointer",
      },
    }),
    dropdownIndicator: (base) => ({
      ...base,
      color: "var(--secondary-color)",
      ":hover": {
        cursor: "pointer",
      },
    }),
    clearIndicator: (base) => ({
      ...base,
      color: "var(--secondary-color)",
      cursor: "pointer",
      ":hover": {
        backgroundColor: "red",
        cursor: "pointer",
      },
    }),
  };

  return (
    <>
      <h1 id="welcome-message">Welcome to LinguaConnect!</h1>
      <p id="page-title">Create Your Profile</p>

      <div className="profile-creation-container">
        <form onSubmit={handleSubmit} className="profile-creation-form">
          {/* Name Section */}
          <fieldset className="name-section">
            <legend>Full Name</legend>

            <label htmlFor="firstName">First Name:</label>
            <input
              type="text"
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
            <label htmlFor="lastName">Last Name:</label>
            <input
              type="text"
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </fieldset>

          {/* Languages Section */}
          <fieldset className="language-section">
            <legend>Languages</legend>

            {/* Native Language */}
            <label htmlFor="nativeLanguages">Native:</label>
            <Select
              isMulti
              styles={customStyles}
              name="nativeLanguages"
              options={languageOptions}
              classNamePrefix="select"
              value={nativeLanguage.map((lang) => ({
                value: lang,
                label: lang,
              }))}
              onChange={(selected) =>
                setNativeLanguage(selected.map((item) => item.value))
              }
            />

            <br />

            {/* Fluent Languages */}
            <label htmlFor="fluentLanguages">Fluent:</label>
            <Select
              isMulti
              styles={customStyles}
              name="fluentLanguages"
              options={languageOptions}
              classNamePrefix="select"
              value={fluentLanguages.map((lang) => ({
                value: lang,
                label: lang,
              }))}
              onChange={(selected) =>
                setFluentLanguages(selected.map((item) => item.value))
              }
            />

            <br />

            {/* Learning Languages */}
            <label htmlFor="learningLanguages">Learning:</label>
            <Select
              isMulti
              styles={customStyles}
              name="learningLanguages"
              options={languageOptions}
              classNamePrefix="select"
              value={learningLanguages.map((lang) => ({
                value: lang,
                label: lang,
              }))}
              onChange={(selected) =>
                setLearningLanguages(selected.map((item) => item.value))
              }
            />
          </fieldset>

          {/* About Section */}
          <fieldset className="about-section">
            <legend>About</legend>
            <label htmlFor="talkAbout">What do you like to talk about?</label>
            <textarea
              value={talkAbout}
              onChange={(e) => setTalkAbout(e.target.value)}
              maxLength="250"
            ></textarea>
            <br />

            <label htmlFor="perfectPartner">
              What’s your perfect LinguaConnect partner like?
            </label>
            <textarea
              value={perfectPartner}
              onChange={(e) => setPerfectPartner(e.target.value)}
              maxLength="250"
            ></textarea>
            <br />

            <label htmlFor="learningGoals">
              What are your language learning goals?
            </label>
            <textarea
              value={learningGoals}
              onChange={(e) => setLearningGoals(e.target.value)}
              maxLength="250"
            ></textarea>
          </fieldset>

          {/* Profile Picture */}
          <fieldset className="profile-picture-section">
            <legend>Profile Picture</legend>
            <label htmlFor="profilePicture">Profile Picture:</label>
            <input
              type="file"
              id="profilePicture"
              accept="image/*"
              onChange={(e) => setProfilePicture(e.target.files[0])}
            />
          </fieldset>

          {/* Photos Section */}
          <fieldset className="photos-section">
            <legend>Photos</legend>
            <label htmlFor="photos">Upload Photos:</label>
            <input
              type="file"
              multiple
              onChange={(e) => setPhotos(e.target.files)}
            />
          </fieldset>

          <button type="submit" className="profile-creation-button">
            Create Profile
          </button>
        </form>
      </div>
    </>
  );
}

export default ProfileCreationForm;
