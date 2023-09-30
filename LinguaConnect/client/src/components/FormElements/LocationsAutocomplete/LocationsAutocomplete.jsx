import React, { useEffect, useRef, useState } from "react";
import "./LocationsAutocomplete.css";

const LocationsAutocomplete = ({ onPlaceSelected }) => {
  const inputRef = useRef(null);
  const [autocomplete, setAutocomplete] = useState(null);

  useEffect(() => {
    // Initialize Google Places Autocomplete once the component is mounted
    if (window.google && window.google.maps && window.google.maps.places) {
      const autocompleteInstance = new window.google.maps.places.Autocomplete(
        inputRef.current,
        {
          types: ["(cities)"],
        }
      );
      setAutocomplete(autocompleteInstance);

      // Add listener to capture the selected value
      autocompleteInstance.addListener("place_changed", () => {
        const place = autocompleteInstance.getPlace();
        if (place.geometry) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          const fullAddress = place.formatted_address;
          if (onPlaceSelected) {
            onPlaceSelected({
              lat,
              lng,
              fullAddress,
            });
          }
        }
      });
    }
  }, []);

  return (
    <input
      ref={inputRef}
      type="text"
      placeholder="Enter your location..."
      className="autofill-input"
    />
  );
};

export default LocationsAutocomplete;
