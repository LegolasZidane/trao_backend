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
Generate a travel plan for a ${durationDays}-day trip to ${destination}.

Budget Tier: ${budgetTier}
Interests: ${interests.join(", ")}

IMPORTANT RULES:

1. Return ONLY valid JSON.
2. Do NOT wrap the JSON in markdown.
3. Do NOT include explanations.
4. Do NOT include text before or after the JSON.

Allowed values:

timeOfDay:
- Morning
- Afternoon
- Evening
- Night

packingList.category:
- Documents
- Clothing
- Gear
- Other

The response MUST match this schema exactly:

{
  "itinerary": [
    {
      "dayNumber": 1,
      "activities": [
        {
          "title": "Activity name",
          "description": "Brief description",
          "estimatedCostUSD": 20,
          "timeOfDay": "Morning"
        }
      ]
    }
  ],
  "hotels": [
    {
      "name": "Hotel Name",
      "tier": "Budget",
      "estimatedCostNightUSD": 80,
      "rating": "4.5/5"
    }
  ],
  "estimatedBudget": {
    "transport": 100,
    "accommodation": 300,
    "food": 150,
    "activities": 100,
    "total": 650
  },
  "packingList": [
    {
      "item": "Passport",
      "category": "Documents",
      "isPacked": false
    }
  ]
}

VALIDATION REQUIREMENTS:

- Every activity.timeOfDay MUST be one of:
  Morning, Afternoon, Evening, Night

- Every packingList.category MUST be one of:
  Documents, Clothing, Gear, Other

- Never use values such as:
  Apparel, Footwear, Accessories, Electronics,
  Toiletries & Health, Essentials, Financial

- Budget numbers must be realistic.

Return only the JSON object.
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

exports.addActivity = async (req, res) => {
  try {
    const { tripId, dayNumber } = req.params;

    const { title, description, estimatedCostUSD, timeOfDay } = req.body;

    const trip = await Trip.findOne({
      _id: tripId,
      userId: req.user.id,
    });

    if (!trip) {
      return res.status(404).json({
        message: "Trip not found",
      });
    }

    const day = trip.itinerary.find((d) => d.dayNumber === Number(dayNumber));

    if (!day) {
      return res.status(404).json({
        message: "Day not found",
      });
    }

    const newActivity = {
      title,
      description,
      estimatedCostUSD,
      timeOfDay,
    };

    const order = {
      Morning: 1,
      Afternoon: 2,
      Evening: 3,
      Night: 4,
    };

    day.activities.push(newActivity);

    day.activities.sort((a, b) => order[a.timeOfDay] - order[b.timeOfDay]);

    await trip.save();

    res.status(201).json({
      message: "Activity added successfully",
      activity: day.activities[day.activities.length - 1],
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
};

exports.removeActivity = async (req, res) => {
  try {
    const { tripId, dayNumber, activityId } = req.params;

    const trip = await Trip.findById(tripId);

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    const day = trip.itinerary[dayNumber - 1];

    if (!day) {
      return res.status(404).json({ message: "Day not found" });
    }

    const activityIndex = day.activities.findIndex(
      (activity) => activity._id.toString() === activityId,
    );

    if (activityIndex === -1) {
      return res.status(404).json({ message: "Activity not found" });
    }

    day.activities.splice(activityIndex, 1);

    await trip.save();

    res.status(200).json({
      message: "Activity removed successfully",
      itinerary: trip.itinerary,
    });
  } catch (error) {
    console.error("Remove Activity Error:", error);
    res.status(500).json({
      message: "Failed to remove activity",
      error: error.message,
    });
  }
};

exports.regenerateDay = async (req, res) => {
  const { tripId, dayNumber } = req.params;
  const { feedback } = req.body;

  try {
    const trip = await Trip.findById(tripId);

    if (!trip) {
      return res.status(404).json({
        message: "Trip not found",
      });
    }

    const day = trip.itinerary[dayNumber - 1];

    if (!day) {
      return res.status(404).json({
        message: "Day not found",
      });
    }

    const prompt = `
You are modifying a single day in an existing travel itinerary.

Trip Details:
Destination: ${trip.destination}
Duration: ${trip.durationDays} days
Budget Tier: ${trip.budgetTier}
Interests: ${trip.interests.join(", ")}

Current Day:
${JSON.stringify(day, null, 2)}

User Feedback:
${feedback}

IMPORTANT RULES:

1. Return ONLY valid JSON.
2. Do NOT wrap JSON in markdown.
3. Do NOT include explanations.
4. Return ONLY the updated day object.

Allowed values:

timeOfDay:
- Morning
- Afternoon
- Evening
- Night

Schema:

{
  "dayNumber": 1,
  "activities": [
    {
      "title": "Activity name",
      "description": "Brief description",
      "estimatedCostUSD": 20,
      "timeOfDay": "Morning"
    }
  ]
}

VALIDATION REQUIREMENTS:

- Every activity.timeOfDay MUST be one of:
  Morning, Afternoon, Evening, Night

- Keep the dayNumber unchanged.
- Generate activities based on the user's feedback.
- Return only the JSON object.
`;

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
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestPayload),
    });

    const parsedResponseText =
      data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!parsedResponseText) {
      throw new Error("Could not extract generation data from response.");
    }

    const regeneratedDay = JSON.parse(parsedResponseText);

    trip.itinerary.set(Number(dayNumber - 1), regeneratedDay);

    await trip.save();

    return res.status(200).json({
      message: "Day regenerated successfully",
      day: regeneratedDay,
    });
  } catch (error) {
    console.error("Day Regeneration Error:", error);

    return res.status(500).json({
      message: "Failed to regenerate day.",
    });
  }
};