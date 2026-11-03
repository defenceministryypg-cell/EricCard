/* =====================================
   ERIC ANDOH DIGITAL CARD
   SUPABASE CONFIGURATION
===================================== */

const SUPABASE_URL =
    "https://mcpqobgxdjihkntphovi.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_9j7w0tU6nAzj2OlLFBjbdQ_hHLYuVOr";

const db = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);


/* =====================================
   DEFAULT PROFILE INFORMATION
===================================== */

const defaultProfile = {
    full_name: "HON. ERIC ANDOH",
    title: "Minister for Defence, Youth Parliament Ghana",
    headline: "Youth Leader | IT Professional | Entrepreneur",
    biography: "Welcome to my professional digital profile. Explore my background, leadership journey, education and professional work.",
    phone: "0542044490",
    whatsapp: "233542044490",
    location: "Ghana",

    education: [
        {
            title: "BSc Information Technology",
            institution: "Ghana Communication Technology University"
        },
        {
            title: "Diploma in Cybersecurity",
            institution: "Professional qualification"
        },
        {
            title: "Hardware & Satellite Engineering",
            institution: "Professional qualification"
        }
    ],

    experience: [],
    achievements: [],
    social_links: {}
};


/* =====================================
   HELPER FUNCTIONS
===================================== */

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[char]);
}


function normalizePhone(phone) {
    let number = String(phone || "").replace(/\D/g, "");

    if (number.startsWith("00")) {
        number = number.slice(2);
    }

    if (number.startsWith("0")) {
        number = "233" + number.slice(1);
    }

    return number;
}


function safeURL(value) {
    try {
        const url = new URL(value);

        return ["https:", "http:"].includes(url.protocol)
            ? url.href
            : null;

    } catch {
        return null;
    }
}


function getElement(id) {
    return document.getElementById(id);
}


function setText(id, value) {
    const element = getElement(id);

    if (element) {
        element.textContent = value ?? "";
    }
}


function formatExperienceDate(value) {
    if (!value) return "";

    const date = new Date(`${value}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString("en-GB", {
        month: "short",
        year: "numeric"
    });
}
/* =====================================
   UPDATE CONTACT INFORMATION
===================================== */

function updateContacts(profile) {
    const phone = String(
        profile.phone || defaultProfile.phone
    );

    const whatsapp = normalizePhone(
        profile.whatsapp ||
        profile.phone ||
        defaultProfile.whatsapp
    );

    const tel = phone.replace(/[^\d+]/g, "");

    const callButton = getElement("callButton");
    const contactPhone = getElement("contactPhone");
    const whatsappButton = getElement("whatsappButton");
    const contactWhatsapp = getElement("contactWhatsapp");

    if (callButton) callButton.href = `tel:${tel}`;
    if (contactPhone) contactPhone.href = `tel:${tel}`;

    const whatsappURL = `https://wa.me/${whatsapp}`;

    if (whatsappButton) whatsappButton.href = whatsappURL;
    if (contactWhatsapp) contactWhatsapp.href = whatsappURL;

    const email = String(profile.email || "").trim();
    const emailElement = getElement("contactEmail");

    if (email && emailElement) {
        emailElement.hidden = false;
        emailElement.href = `mailto:${email}`;

        setText("emailText", email);
    } else if (emailElement) {
        emailElement.hidden = true;
    }

    const website = safeURL(profile.website);
    const websiteElement = getElement("contactWebsite");

    if (website && websiteElement) {
        websiteElement.hidden = false;
        websiteElement.href = website;
    } else if (websiteElement) {
        websiteElement.hidden = true;
    }
}


/* =====================================
   EDUCATION
===================================== */

function renderEducation(items) {
    const container = getElement("educationList");

    if (!container) return;

    if (!Array.isArray(items) || !items.length) {
        container.innerHTML = `
            <p class="empty-state">
                Education details will be updated soon.
            </p>
        `;
        return;
    }

    container.innerHTML = items.map((item, index) => `
        <article class="info-card">

            <span class="card-icon">
                ${String(index + 1).padStart(2, "0")}
            </span>

            <h3>
                ${escapeHTML(
                    item.title || item.name || "Qualification"
                )}
            </h3>

            <p>
                ${escapeHTML(
                    item.institution || item.school || ""
                )}
            </p>

            ${
                item.year
                    ? `<p>${escapeHTML(item.year)}</p>`
                    : ""
            }

            ${
                item.description
                    ? `<p>${escapeHTML(item.description)}</p>`
                    : ""
            }

        </article>
    `).join("");
}


/* =====================================
   PROFESSIONAL EXPERIENCE
===================================== */

function renderExperience(items) {
    const container = getElement("experienceList");

    if (!container) return;

    if (!Array.isArray(items) || !items.length) {
        container.innerHTML = `
            <p class="empty-state">
                Professional experience will be updated soon.
            </p>
        `;
        return;
    }

    container.innerHTML = items.map(item => {
        const start = formatExperienceDate(item.start_date);

        const end = item.current
            ? "Present"
            : formatExperienceDate(item.end_date);

        const period = item.period ||
            [start, end].filter(Boolean).join(" – ");

        return `
            <article class="timeline-item">

                <h3>
                    ${escapeHTML(
                        item.title ||
                        item.position ||
                        "Professional Role"
                    )}
                </h3>

                <small>
                    ${escapeHTML(
                        item.organization ||
                        item.company ||
                        ""
                    )}

                    ${
                        period
                            ? " · " + escapeHTML(period)
                            : ""
                    }
                </small>

                ${
                    item.current
                        ? `<span class="current-badge">Currently working here</span>`
                        : ""
                }

                <p>
                    ${escapeHTML(item.description || "")}
                </p>

            </article>
        `;
    }).join("");
}


/* =====================================
   ACHIEVEMENTS
===================================== */

function renderAchievements(items) {
    const container = getElement("achievementsList");

    if (!container) return;

    if (!Array.isArray(items) || !items.length) {
        container.innerHTML = "";
        return;
    }

    container.innerHTML = items.map(item => {
        const title = typeof item === "string"
            ? item
            : item.title || item.name || "Achievement";

        const description = typeof item === "string"
            ? ""
            : item.description || "";

        return `
            <article class="achievement-item">

                <h3>${escapeHTML(title)}</h3>

                <p>${escapeHTML(description)}</p>

            </article>
        `;
    }).join("");
}


/* =====================================
   SOCIAL MEDIA
===================================== */

function renderSocialLinks(links) {
    const container = getElement("socialLinks");

    if (!container) return;

    if (!links || typeof links !== "object" || Array.isArray(links)) {
        container.innerHTML = "";
        return;
    }

    container.innerHTML = Object.entries(links)
        .map(([name, url]) => {
            const safe = safeURL(url);

            if (!safe) return "";

            return `
                <a
                    href="${escapeHTML(safe)}"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    ${escapeHTML(name)}
                </a>
            `;
        })
        .join("");
}

/* =====================================
   APPLY PUBLIC APPEARANCE SETTINGS
   Settings loaded from Supabase
===================================== */

const defaultAppearance = {
    showProfileImage: true,
    showBiography: true,
    showEducation: true,
    showExperience: true,
    showAchievements: true,
    showSocial: true
};


// Hide or show a complete content section
function setSectionVisibility(elementId, visible) {
    const element = document.getElementById(elementId);

    if (!element) return;

    const section = element.closest("section");

    if (section) {
        section.hidden = !visible;
    } else {
        element.hidden = !visible;
    }
}


// APPLY APPEARANCE SETTINGS

function applyAppearanceSettings(savedSettings = {}) {

    const settings = {
        ...defaultAppearance,
        ...(savedSettings || {})
    };

    // Profile photograph
    const profileImage = document.getElementById("profileImage");

    if (profileImage) {
        profileImage.hidden = !settings.showProfileImage;
    }

    // Biography
    const biography = document.getElementById("biography");

    if (biography) {
        biography.hidden = !settings.showBiography;
    }

    // Education
    setSectionVisibility(
        "educationList",
        settings.showEducation
    );

    // Professional experience
    setSectionVisibility(
        "experienceList",
        settings.showExperience
    );

    // Achievements
    setSectionVisibility(
        "achievementsList",
        settings.showAchievements
    );

    // Social media
    setSectionVisibility(
        "socialLinks",
        settings.showSocial
    );

    console.log("Appearance settings applied.");
}

/* =====================================
   PROFILE DISPLAY
===================================== */

function displayProfile(profile) {
    setText(
        "fullName",
        profile.full_name || defaultProfile.full_name
    );

    setText(
        "headline",
        profile.headline || defaultProfile.headline
    );

    setText(
        "jobTitle",
        profile.title || defaultProfile.title
    );

    setText(
        "biography",
        profile.biography || defaultProfile.biography
    );

    setText(
        "location",
        "📍 " + (profile.location || defaultProfile.location)
    );

    // Profile photograph
    const profileImage = getElement("profileImage");

    if (profileImage) {
        const imageURL = safeURL(profile.profile_image_url);

        if (imageURL) {
            profileImage.src = imageURL;
        }
    }

    // Other sections
    updateContacts(profile);

    renderEducation(
        Array.isArray(profile.education) && profile.education.length
            ? profile.education
            : defaultProfile.education
    );

    renderExperience(profile.experience || []);

    renderAchievements(profile.achievements || []);

    renderSocialLinks(profile.social_links || {});
    applyAppearanceSettings(profile.appearance);
    displayMainLogo(profile);
}


/* =====================================
   DOWNLOAD CONTACT (VCARD)
===================================== */

function downloadContact(profile) {
    const phone = profile.phone || defaultProfile.phone;
    const email = profile.email || "";
    const name = profile.full_name || defaultProfile.full_name;

    const vcard = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `FN:${name}`,
        `ORG:${profile.title || defaultProfile.title}`,
        `TEL;TYPE=CELL:${phone}`,
        email ? `EMAIL:${email}` : "",
        profile.website ? `URL:${profile.website}` : "",
        "END:VCARD"
    ].filter(Boolean).join("\r\n");

    const blob = new Blob([vcard], {
        type: "text/vcard;charset=utf-8"
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = "Eric-Andoh-Contact.vcf";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
}

/* =====================================
   PROFESSIONAL QR CODE GENERATOR
===================================== */

function generateQR() {
    const container = document.getElementById("qrcode");

    if (!container) return;

    container.innerHTML = "";

    if (typeof QRCode === "undefined") {
        container.textContent = "QR library failed to load.";
        return;
    }

    // Your live public digital card URL
    const PUBLIC_PROFILE_URL = window.location.origin;

    new QRCode(container, {
        text: PUBLIC_PROFILE_URL,
        width: 150,
        height: 150,
        colorDark: "#101827",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });
}


// DOWNLOAD QR CODE

document.getElementById("downloadQR")?.addEventListener("click", () => {
    const container = document.getElementById("qrcode");

    const qrImage = container?.querySelector("img");
    const qrCanvas = container?.querySelector("canvas");

    let imageURL = "";

    if (qrImage?.src) {
        imageURL = qrImage.src;
    } else if (qrCanvas) {
        imageURL = qrCanvas.toDataURL("image/png");
    }

    if (!imageURL) {
        alert("QR code is not ready. Please try again.");
        return;
    }

    const link = document.createElement("a");

    link.href = imageURL;
    link.download = "Eric-Andoh-Digital-Card-QR.png";

    document.body.appendChild(link);
    link.click();
    link.remove();
});


/* =====================================
   LOAD PROFILE FROM SUPABASE
===================================== */

async function loadProfile() {
    let profile = { ...defaultProfile };

    try {
        const { data, error } = await db
            .from("profiles")
            .select("*")
            .eq("singleton", true)
            .maybeSingle();

        if (error) throw error;

        if (data) {
            profile = {
                ...defaultProfile,
                ...data
            };
        }

        displayProfile(profile);

        console.log(
            "Digital profile loaded successfully."
        );

    } catch (error) {
        console.error("Profile loading error:", error);

        displayProfile(defaultProfile);
    }

    // Save Contact button
    const saveContact = getElement("saveContact");

    if (saveContact) {
        saveContact.addEventListener("click", () => {
            downloadContact(profile);
        });
    }

    generateQR();
}

function displayMainLogo(profile) {
    const logo = document.getElementById("mainLogo");
    const fallback = document.getElementById("mainLogoFallback");

    if (!logo || !fallback) return;

    if (profile.logo_url) {
        logo.src = profile.logo_url;
        logo.hidden = false;
        fallback.hidden = true;
    } else {
        logo.hidden = true;
        fallback.hidden = false;
    }
}

/* =====================================
   INITIALIZE
===================================== */

const yearElement = getElement("year");

if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
}

loadProfile();
