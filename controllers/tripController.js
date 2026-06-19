const Trip = require("../models/Trip");

// Exponential backoff executor for external API resilience
async function fetchWithRetry(url, options, retries = 5, delay = 1000) {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      if (response.status === 429 && retries > 0) {
        // Wait and retry on rate limits
        await new Promise((resolve) => setTimeout(resolve, delay));
        return fetchWithRetry(url, options, retries - 1, delay * 2);
      }
      throw new Error(`External API Error: Status Code ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    if (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1, delay * 2);
    }
    throw error;
  }
}

exports.generateTrip = async (req, res) => {
  const { destination, durationDays, budgetTier, interests } = req.body;
  const userId = req.user.id; // Populated from authentication middleware securely

  const prompt = `
    Create a detailed travel plan for a ${durationDays}-day trip to ${destination}.
    Budget preference is ${budgetTier}. Interests are: ${interests.join(", ")}.

    You must output ONLY a valid JSON object matching this structure:
    {
      "itinerary": [
        {
          "dayNumber": 1,
          "activities": [
            { "title": "Activity name", "description": "Brief text details", "estimatedCostUSD": 20, "timeOfDay": "Morning" }
          ]
        }
      ],
      "hotels": [
        { "name": "Recommended Hotel", "tier": "Budget", "estimatedCostNightUSD": 85, "rating": "4.5/5" }
      ],
      "estimatedBudget": {
        "transport": 120,
        "accommodation": 300,
        "food": 150,
        "activities": 100,
        "total": 670
      },
      "packingList": [
        { "item": "Passport", "category": "Documents", "isPacked": false }
      ]
    }
    Make sure estimates match typical realistic local rates for the specified budgetTier.
  `;

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const requestPayload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      },
    };

    const data = await fetchWithRetry(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestPayload),
    });

    const parsedResponseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!parsedResponseText) {
      throw new Error("Could not extract generation data from response.");
    }

    const cleanResult = JSON.parse(parsedResponseText);

    // Save user isolated trip directly into MongoDB
    const newTrip = new Trip({
      userId,
      destination,
      durationDays,
      budgetTier,
      interests,
      itinerary: cleanResult.itinerary,
      hotels: cleanResult.hotels,
      estimatedBudget: cleanResult.estimatedBudget,
      packingList: cleanResult.packingList,
    });

    const savedTrip = await newTrip.save();
    return res.status(201).json(savedTrip);
  } catch (error) {
    console.error("Critical AI Generation Error:", error);
    return res.status(500).json({
      message:
        "Fail-safe: API encountered an error processing your trip. Please try again.",
    });
  }
};

exports.getTrips = async (req, res) => {
  try {
    const trips = await Trip.find({ userId: req.user.id }).sort({
      createdAt: -1,
    });

    res.json(trips);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getTripById = async (req, res) => {
  try {
    const trip = await Trip.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!trip) {
      return res.status(404).json({
        message: "Trip not found",
      });
    }

    res.json(trip);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteTrip = async (req, res) => {
  try {
    const trip = await Trip.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!trip) {
      return res.status(404).json({
        message: "Trip not found",
      });
    }

    res.json({
      message: "Trip deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
