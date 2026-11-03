/* =========================================================
   ERIC ANDOH DIGITAL CARD — ADMIN DASHBOARD
   Profile, Education and Experience Management
========================================================= */

const SUPABASE_URL = "https://mcpqobgxdjihkntphovi.supabase.co";
const SUPABASE_KEY = "sb_publishable_9j7w0tU6nAzj2OlLFBjbdQ_hHLYuVOr";

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentProfile = null;
let selectedPhoto = null;
let toastTimer = null;

// ---------------------------------------------------------
// HELPERS
// ---------------------------------------------------------

function showToast(message) {
    const toast = document.getElementById("toast");

    if (!toast) {
        alert(message);
        return;
    }

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 3500);
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[char]);
}

function getArray(value) {
    return Array.isArray(value) ? value : [];
}

function hasAdminSession() {
    return db.auth.getSession().then(({ data, error }) => {
        if (error) throw error;
        return Boolean(data.session);
    });
}

// ---------------------------------------------------------
// DASHBOARD NAVIGATION
// ---------------------------------------------------------

const navTitles = {
    overview: "Dashboard Overview",
    profile: "Personal Profile",
    education: "Education & Qualifications",
    experience: "Professional Experience",
    achievements: "Leadership & Achievements",
    contacts: "Contact Details",
    social: "Social Media",
    logo: "Website Logo",
    appearance: "Appearance Settings"
};

function openSection(sectionId) {
    const target = document.getElementById(sectionId);

    if (!target) return;

    document.querySelectorAll(".admin-section").forEach(section => {
        section.classList.toggle(
            "active",
            section.id === sectionId
        );
    });

    document.querySelectorAll(".nav-link").forEach(link => {
        link.classList.toggle(
            "active",
            link.dataset.section === sectionId
        );
    });

    const title = document.getElementById("pageTitle");

    if (title) {
        title.textContent = navTitles[sectionId] || "Dashboard";
    }

    document.getElementById("sidebar")?.classList.remove("open");
}

document.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", () => {
        openSection(link.dataset.section);
    });
});

document.querySelectorAll("[data-go]").forEach(button => {
    button.addEventListener("click", () => {
        openSection(button.dataset.go);
    });
});

document.getElementById("menuToggle")?.addEventListener("click", () => {
    document.getElementById("sidebar")?.classList.toggle("open");
});

// ---------------------------------------------------------
// LOAD PROFILE
// ---------------------------------------------------------

async function loadProfile() {
    const saveButton = document.getElementById("saveProfile");

    try {
        if (saveButton) {
            saveButton.disabled = true;
            saveButton.textContent = "Loading Profile...";
        }

        const { data, error } = await db
            .from("profiles")
            .select("*")
            .eq("singleton", true)
            .maybeSingle();

        if (error) throw error;

        if (!data) {
            throw new Error(
                "No profile record found in the profiles table."
            );
        }

        currentProfile = data;

        // Populate profile fields
        const fields = {
            fullName: data.full_name,
            jobTitle: data.title,
            headline: data.headline,
            biography: data.biography,
            location: data.location
        };

        Object.entries(fields).forEach(([id, value]) => {
            const element = document.getElementById(id);

            if (element) {
                element.value = value || "";
            }
        });

        // Load profile photograph
        const photoPreview = document.getElementById("photoPreview");

        if (photoPreview && data.profile_image_url) {
            photoPreview.src = data.profile_image_url;
        }

        const photoStatus = document.getElementById("photoStatus");

        if (photoStatus) {
            photoStatus.textContent = data.profile_image_url
                ? "Saved photograph loaded."
                : "No photograph uploaded yet.";
        }

        // Load Education and Experience records
        renderEducationAdmin(data.education);
        renderExperienceAdmin(data.experience);
        renderAchievementAdmin(data.achievements);
        loadContactDetails();
        loadSocialLinks();
        loadAppearanceSettings();
        loadLogo();

        showToast("Profile loaded successfully.");

    } catch (error) {
        console.error("Profile loading error:", error);

        showToast(
            error.message ||
            "Unable to load profile. Check your database."
        );

    } finally {
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.textContent = "Save Profile Changes";
        }
    }
}

// ---------------------------------------------------------
// PROFILE PHOTO PREVIEW
// ---------------------------------------------------------

document.getElementById("photoInput")?.addEventListener(
    "change",
    function () {
        const file = this.files?.[0];

        if (!file) return;

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];

        if (!allowedTypes.includes(file.type)) {
            showToast("Select a JPG, PNG or WebP image.");
            this.value = "";
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            showToast("Photograph must not exceed 5MB.");
            this.value = "";
            return;
        }

        selectedPhoto = file;

        const preview = document.getElementById("photoPreview");

        if (preview) {
            if (preview.dataset.objectUrl) {
                URL.revokeObjectURL(preview.dataset.objectUrl);
            }

            const objectUrl = URL.createObjectURL(file);

            preview.src = objectUrl;
            preview.dataset.objectUrl = objectUrl;
        }

        const status = document.getElementById("photoStatus");

        if (status) {
            status.textContent =
                `New photograph selected: ${file.name}`;
        }

        showToast(
            "Photograph preview updated. Save your profile to upload it."
        );
    }
);

// ---------------------------------------------------------
// UPLOAD PROFILE PHOTO TO SUPABASE STORAGE
// ---------------------------------------------------------

async function uploadProfilePhoto() {
    if (!selectedPhoto) {
        return currentProfile?.profile_image_url || null;
    }

    const extension = selectedPhoto.name
        .split(".")
        .pop()
        .toLowerCase();

    const filePath =
        `profiles/eric-andoh-${Date.now()}.${extension}`;

    const { error } = await db.storage
        .from("profile-images")
        .upload(filePath, selectedPhoto, {
            cacheControl: "3600",
            upsert: false,
            contentType: selectedPhoto.type
        });

    if (error) throw error;

    const { data } = db.storage
        .from("profile-images")
        .getPublicUrl(filePath);

    selectedPhoto = null;

    const input = document.getElementById("photoInput");

    if (input) {
        input.value = "";
    }

    return data.publicUrl;
}
// ---------------------------------------------------------
// SAVE BASIC PROFILE
// ---------------------------------------------------------

document.getElementById("profileForm")?.addEventListener(
    "submit",
    async event => {
        event.preventDefault();

        const button = document.getElementById("saveProfile");

        const profileData = {
            full_name: document.getElementById("fullName")?.value.trim() || "",
            title: document.getElementById("jobTitle")?.value.trim() || "",
            headline: document.getElementById("headline")?.value.trim() || "",
            biography: document.getElementById("biography")?.value.trim() || "",
            location: document.getElementById("location")?.value.trim() || "",
            updated_at: new Date().toISOString()
        };

        if (!profileData.full_name || !profileData.title) {
            showToast("Name and official position are required.");
            return;
        }

        try {
            if (button) {
                button.disabled = true;
                button.textContent = "Saving...";
            }

            if (!(await hasAdminSession())) {
                showToast("Please sign in as administrator.");
                return;
            }

            if (selectedPhoto) {
                profileData.profile_image_url =
                    await uploadProfilePhoto();
            }

            const { data, error } = await db
                .from("profiles")
                .update(profileData)
                .eq("singleton", true)
                .select()
                .single();

            if (error) throw error;

            currentProfile = data;

            showToast("Your profile has been updated!");

        } catch (error) {
            console.error("Save profile error:", error);

            showToast(
                error.message || "Unable to save profile."
            );

        } finally {
            if (button) {
                button.disabled = false;
                button.textContent = "Save Profile Changes";
            }
        }
    }
);

// ---------------------------------------------------------
// EDUCATION MANAGEMENT
// Stored in profiles.education (JSONB)
// ---------------------------------------------------------

function getEducationRecords() {
    return getArray(currentProfile?.education);
}

function renderEducationAdmin(items = []) {
    const container = document.getElementById("educationAdminList");
    const count = document.getElementById("educationCount");

    if (!container) return;

    items = getArray(items);

    if (count) {
        count.textContent =
            `${items.length} Record${items.length === 1 ? "" : "s"}`;
    }

    if (!items.length) {
        container.innerHTML = `
            <p class="empty-state">
                No qualifications added yet.
                Add your first qualification above.
            </p>
        `;

        return;
    }

    container.innerHTML = items.map((item, index) => `
        <div class="education-record">
            <div>
                <h4>${escapeHTML(item.title)}</h4>

                <p>${escapeHTML(item.institution)}</p>

                ${
                    item.year
                        ? `<div class="record-year">${escapeHTML(item.year)}</div>`
                        : ""
                }

                ${
                    item.description
                        ? `<p>${escapeHTML(item.description)}</p>`
                        : ""
                }
            </div>

            <div class="record-buttons">
                <button
                    type="button"
                    data-edit-education="${index}">
                    Edit
                </button>

                <button
                    type="button"
                    class="delete-button"
                    data-delete-education="${index}">
                    Delete
                </button>
            </div>
        </div>
    `).join("");
}

function resetEducationForm() {
    document.getElementById("educationForm")?.reset();

    const id = document.getElementById("educationId");
    const title = document.getElementById("educationFormTitle");
    const button = document.getElementById("educationSaveButton");
    const cancel = document.getElementById("cancelEducation");

    if (id) id.value = "";

    if (title) {
        title.textContent = "Add Education / Qualification";
    }

    if (button) {
        button.textContent = "Add Qualification";
    }

    if (cancel) {
        cancel.hidden = true;
    }
}

function editEducation(index) {
    const item = getEducationRecords()[index];

    if (!item) return;

    document.getElementById("educationId").value = index;

    document.getElementById("educationTitle").value =
        item.title || "";

    document.getElementById("educationInstitution").value =
        item.institution || "";

    document.getElementById("educationYear").value =
        item.year || "";

    document.getElementById("educationDescription").value =
        item.description || "";

    document.getElementById("educationFormTitle").textContent =
        "Edit Education / Qualification";

    document.getElementById("educationSaveButton").textContent =
        "Update Qualification";

    document.getElementById("cancelEducation").hidden = false;

    document.getElementById("educationForm").scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}

async function saveEducation(items) {
    if (!(await hasAdminSession())) {
        throw new Error("Please sign in as administrator.");
    }

    const { data, error } = await db
        .from("profiles")
        .update({
            education: items,
            updated_at: new Date().toISOString()
        })
        .eq("singleton", true)
        .select()
        .single();

    if (error) throw error;

    currentProfile = data;

    renderEducationAdmin(data.education);
}

document.getElementById("educationForm")?.addEventListener(
    "submit",
    async event => {
        event.preventDefault();

        const button = document.getElementById("educationSaveButton");

        const title = document
            .getElementById("educationTitle")
            .value.trim();

        const institution = document
            .getElementById("educationInstitution")
            .value.trim();

        const year = document
            .getElementById("educationYear")
            .value.trim();

        const description = document
            .getElementById("educationDescription")
            .value.trim();

        const editIndex = document
            .getElementById("educationId")
            .value;

        if (!title || !institution) {
            showToast(
                "Qualification and institution are required."
            );

            return;
        }

        const items = [...getEducationRecords()];

        const record = {
            title,
            institution,
            year,
            description
        };

        if (editIndex !== "") {
            items[Number(editIndex)] = record;
        } else {
            items.push(record);
        }

        try {
            button.disabled = true;
            button.textContent = "Saving...";

            await saveEducation(items);

            resetEducationForm();

            showToast(
                editIndex !== ""
                    ? "Qualification updated successfully!"
                    : "Qualification added successfully!"
            );

        } catch (error) {
            console.error("Education save error:", error);

            showToast(
                error.message || "Unable to save qualification."
            );

        } finally {
            button.disabled = false;

            button.textContent =
                document.getElementById("educationId").value === ""
                    ? "Add Qualification"
                    : "Update Qualification";
        }
    }
);

async function deleteEducation(index) {
    if (!window.confirm(
        "Are you sure you want to delete this qualification?"
    )) {
        return;
    }

    const items = [...getEducationRecords()];

    if (!items[index]) return;

    items.splice(index, 1);

    try {
        await saveEducation(items);

        resetEducationForm();

        showToast("Qualification deleted successfully!");

    } catch (error) {
        console.error("Education deletion error:", error);

        showToast(
            error.message || "Unable to delete qualification."
        );
    }
}

document.getElementById("educationAdminList")?.addEventListener(
    "click",
    event => {
        const edit = event.target.closest("[data-edit-education]");
        const remove = event.target.closest("[data-delete-education]");

        if (edit) {
            editEducation(Number(edit.dataset.editEducation));
        }

        if (remove) {
            deleteEducation(Number(remove.dataset.deleteEducation));
        }
    }
);

document.getElementById("cancelEducation")?.addEventListener(
    "click",
    resetEducationForm
);
// ---------------------------------------------------------
// SAVE BASIC PROFILE
// ---------------------------------------------------------

document.getElementById("profileForm")?.addEventListener("submit", async event => {
    event.preventDefault();

    const button = document.getElementById("saveProfile");
    const profileData = {
        full_name: document.getElementById("fullName")?.value.trim() || "",
        title: document.getElementById("jobTitle")?.value.trim() || "",
        headline: document.getElementById("headline")?.value.trim() || "",
        biography: document.getElementById("biography")?.value.trim() || "",
        location: document.getElementById("location")?.value.trim() || "",
        updated_at: new Date().toISOString()
    };

    if (!profileData.full_name || !profileData.title) {
        showToast("Name and official position are required.");
        return;
    }

    try {
        if (button) {
            button.disabled = true;
            button.textContent = "Saving...";
        }

        if (!(await hasAdminSession())) {
            showToast("Please sign in as administrator.");
            return;
        }

        if (selectedPhoto) {
            profileData.profile_image_url = await uploadProfilePhoto();
        }

        const { data, error } = await db
            .from("profiles")
            .update(profileData)
            .eq("singleton", true)
            .select()
            .single();

        if (error) throw error;

        currentProfile = data;
        showToast("Your profile has been updated!");

    } catch (error) {
        console.error("Save profile error:", error);
        showToast(error.message || "Unable to save profile.");
    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = "Save Profile Changes";
        }
    }
});

// ---------------------------------------------------------
// EDUCATION MANAGEMENT
// Stored in profiles.education (JSONB)
// ---------------------------------------------------------

function getEducationRecords() {
    return getArray(currentProfile?.education);
}

function renderEducationAdmin(items = []) {
    const container = document.getElementById("educationAdminList");
    const count = document.getElementById("educationCount");
    if (!container) return;

    items = getArray(items);

    if (count) {
        count.textContent = `${items.length} Record${items.length === 1 ? "" : "s"}`;
    }

    if (!items.length) {
        container.innerHTML = `<p class="empty-state">No qualifications added yet. Add your first qualification above.</p>`;
        return;
    }

    container.innerHTML = items.map((item, index) => `
        <div class="education-record">
            <div>
                <h4>${escapeHTML(item.title)}</h4>
                <p>${escapeHTML(item.institution)}</p>
                ${item.year ? `<div class="record-year">${escapeHTML(item.year)}</div>` : ""}
            </div>
            <div class="record-buttons">
                <button type="button" data-edit-education="${index}">Edit</button>
                <button type="button" class="delete-button" data-delete-education="${index}">Delete</button>
            </div>
        </div>
    `).join("");
}

function resetEducationForm() {
    document.getElementById("educationForm")?.reset();
    const id = document.getElementById("educationId");
    const title = document.getElementById("educationFormTitle");
    const button = document.getElementById("educationSaveButton");
    const cancel = document.getElementById("cancelEducation");

    if (id) id.value = "";
    if (title) title.textContent = "Add Qualification";
    if (button) button.textContent = "Add Qualification";
    if (cancel) cancel.hidden = true;
}

function editEducation(index) {
    const item = getEducationRecords()[index];
    if (!item) return;

    document.getElementById("educationId").value = index;
    document.getElementById("educationTitle").value = item.title || "";
    document.getElementById("educationInstitution").value = item.institution || "";
    document.getElementById("educationYear").value = item.year || "";
    document.getElementById("educationFormTitle").textContent = "Edit Qualification";
    document.getElementById("educationSaveButton").textContent = "Update Qualification";
    document.getElementById("cancelEducation").hidden = false;

    document.getElementById("educationForm").scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}

async function saveEducation(items) {
    if (!(await hasAdminSession())) {
        throw new Error("Please sign in as administrator.");
    }

    const { data, error } = await db
        .from("profiles")
        .update({
            education: items,
            updated_at: new Date().toISOString()
        })
        .eq("singleton", true)
        .select()
        .single();

    if (error) throw error;

    currentProfile = data;
    renderEducationAdmin(data.education);
}

document.getElementById("educationForm")?.addEventListener("submit", async event => {
    event.preventDefault();

    const button = document.getElementById("educationSaveButton");
    const title = document.getElementById("educationTitle").value.trim();
    const institution = document.getElementById("educationInstitution").value.trim();
    const year = document.getElementById("educationYear").value.trim();
    const editIndex = document.getElementById("educationId").value;

    if (!title || !institution) {
        showToast("Enter the qualification and institution.");
        return;
    }

    const items = [...getEducationRecords()];
    const record = { title, institution, year };

    if (editIndex !== "") {
        items[Number(editIndex)] = record;
    } else {
        items.push(record);
    }

    try {
        button.disabled = true;
        button.textContent = "Saving...";

        await saveEducation(items);
        resetEducationForm();

        showToast(
            editIndex !== ""
                ? "Qualification updated successfully!"
                : "Qualification added successfully!"
        );

    } catch (error) {
        console.error("Education save error:", error);
        showToast(error.message || "Unable to save qualification.");
    } finally {
        button.disabled = false;
        button.textContent =
            document.getElementById("educationId").value === ""
                ? "Add Qualification"
                : "Update Qualification";
    }
});

async function deleteEducation(index) {
    if (!window.confirm("Are you sure you want to delete this qualification?")) {
        return;
    }

    const items = [...getEducationRecords()];

    if (!items[index]) return;

    items.splice(index, 1);

    try {
        await saveEducation(items);
        resetEducationForm();
        showToast("Qualification deleted successfully!");
    } catch (error) {
        console.error("Education deletion error:", error);
        showToast(error.message || "Unable to delete qualification.");
    }
}

document.getElementById("educationAdminList")?.addEventListener("click", event => {
    const edit = event.target.closest("[data-edit-education]");
    const remove = event.target.closest("[data-delete-education]");

    if (edit) editEducation(Number(edit.dataset.editEducation));
    if (remove) deleteEducation(Number(remove.dataset.deleteEducation));
});

document.getElementById("cancelEducation")?.addEventListener("click", resetEducationForm);
// ---------------------------------------------------------
// EXPERIENCE MANAGEMENT
// Stored in profiles.experience (JSONB)
// ---------------------------------------------------------

function getExperienceRecords() {
    return getArray(currentProfile?.experience);
}

function formatExperienceDate(value) {
    if (!value) return "";

    const date = new Date(`${value}T00:00:00`);

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString("en-GB", {
        month: "short",
        year: "numeric"
    });
}

function renderExperienceAdmin(items = []) {
    const container = document.getElementById("experienceAdminList");
    const count = document.getElementById("experienceCount");

    if (!container) return;

    items = getArray(items);

    if (count) {
        count.textContent =
            `${items.length} Record${items.length === 1 ? "" : "s"}`;
    }

    if (!items.length) {
        container.innerHTML = `
            <p class="empty-state">
                No experience records yet.
                Add your first professional position.
            </p>
        `;

        return;
    }

    container.innerHTML = items.map((item, index) => {
        const start = formatExperienceDate(item.start_date);

        const end = item.current
            ? "Present"
            : formatExperienceDate(item.end_date);

        const period = [start, end]
            .filter(Boolean)
            .join(" – ");

        return `
            <article class="experience-record">

                <h4>${escapeHTML(item.title)}</h4>

                <div class="organization">
                    ${escapeHTML(item.organization)}
                </div>

                ${
                    period
                        ? `<div class="period">${escapeHTML(period)}</div>`
                        : ""
                }

                ${
                    item.current
                        ? `<span class="current-badge">● Currently working here</span>`
                        : ""
                }

                <p class="description">
                    ${escapeHTML(item.description || "No description added.")}
                </p>

                <div class="record-buttons">

                    <button
                        type="button"
                        data-edit-experience="${index}">
                        Edit
                    </button>

                    <button
                        type="button"
                        class="delete-button"
                        data-delete-experience="${index}">
                        Delete
                    </button>

                </div>

            </article>
        `;
    }).join("");
}

// ---------------------------------------------------------
// RESET EXPERIENCE FORM
// ---------------------------------------------------------

function resetExperienceForm() {
    document.getElementById("experienceForm")?.reset();

    const id = document.getElementById("experienceId");
    const title = document.getElementById("experienceFormTitle");
    const button = document.getElementById("experienceSaveButton");
    const cancel = document.getElementById("cancelExperience");
    const endDate = document.getElementById("experienceEnd");

    if (id) id.value = "";

    if (title) {
        title.textContent = "Add Professional Experience";
    }

    if (button) {
        button.textContent = "Add Experience";
    }

    if (cancel) {
        cancel.hidden = true;
    }

    if (endDate) {
        endDate.disabled = false;
    }
}

// ---------------------------------------------------------
// EDIT EXPERIENCE
// ---------------------------------------------------------

function editExperience(index) {
    const item = getExperienceRecords()[index];

    if (!item) return;

    document.getElementById("experienceId").value = index;

    document.getElementById("experienceTitle").value =
        item.title || "";

    document.getElementById("experienceOrganization").value =
        item.organization || "";

    document.getElementById("experienceStart").value =
        item.start_date || "";

    document.getElementById("experienceEnd").value =
        item.end_date || "";

    document.getElementById("experienceDescription").value =
        item.description || "";

    document.getElementById("experienceCurrent").checked =
        Boolean(item.current);

    document.getElementById("experienceEnd").disabled =
        Boolean(item.current);

    document.getElementById("experienceFormTitle").textContent =
        "Edit Professional Experience";

    document.getElementById("experienceSaveButton").textContent =
        "Update Experience";

    document.getElementById("cancelExperience").hidden = false;

    document.getElementById("experienceForm").scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}

// ---------------------------------------------------------
// SAVE EXPERIENCE TO SUPABASE
// ---------------------------------------------------------

async function saveExperience(items) {
    if (!(await hasAdminSession())) {
        throw new Error("Please sign in as administrator.");
    }

    const { data, error } = await db
        .from("profiles")
        .update({
            experience: items,
            updated_at: new Date().toISOString()
        })
        .eq("singleton", true)
        .select()
        .single();

    if (error) throw error;

    currentProfile = data;

    renderExperienceAdmin(data.experience);
}

// ---------------------------------------------------------
// CURRENTLY WORKING CHECKBOX
// ---------------------------------------------------------

document.getElementById("experienceCurrent")?.addEventListener(
    "change",
    function () {
        const endDate = document.getElementById("experienceEnd");

        endDate.disabled = this.checked;

        if (this.checked) {
            endDate.value = "";
        }
    }
);

// ---------------------------------------------------------
// ADD OR UPDATE EXPERIENCE
// ---------------------------------------------------------

document.getElementById("experienceForm")?.addEventListener(
    "submit",
    async event => {
        event.preventDefault();

        const button = document.getElementById("experienceSaveButton");

        const title = document
            .getElementById("experienceTitle")
            .value.trim();

        const organization = document
            .getElementById("experienceOrganization")
            .value.trim();

        const startDate = document
            .getElementById("experienceStart")
            .value;

        const endDate = document
            .getElementById("experienceEnd")
            .value;

        const current = document
            .getElementById("experienceCurrent")
            .checked;

        const description = document
            .getElementById("experienceDescription")
            .value.trim();

        const editIndex = document
            .getElementById("experienceId")
            .value;

        if (!title || !organization) {
            showToast("Position and organization are required.");
            return;
        }

        if (startDate && endDate && endDate < startDate) {
            showToast("End date cannot be before start date.");
            return;
        }

        if (current && !startDate) {
            showToast("Enter the start date for your current position.");
            return;
        }

        const items = [...getExperienceRecords()];

        const record = {
            title,
            organization,
            start_date: startDate,
            end_date: current ? "" : endDate,
            current,

            period: [
                formatExperienceDate(startDate),
                current
                    ? "Present"
                    : formatExperienceDate(endDate)
            ].filter(Boolean).join(" – "),

            description
        };

        if (editIndex !== "") {
            items[Number(editIndex)] = record;
        } else {
            items.push(record);
        }

        try {
            button.disabled = true;
            button.textContent = "Saving...";

            await saveExperience(items);

            resetExperienceForm();

            showToast(
                editIndex !== ""
                    ? "Experience updated successfully!"
                    : "Experience added successfully!"
            );

        } catch (error) {
            console.error("Experience save error:", error);

            showToast(
                error.message || "Unable to save experience."
            );

        } finally {
            button.disabled = false;

            button.textContent =
                document.getElementById("experienceId").value === ""
                    ? "Add Experience"
                    : "Update Experience";
        }
    }
);

// ---------------------------------------------------------
// DELETE EXPERIENCE
// ---------------------------------------------------------

async function deleteExperience(index) {
    if (!window.confirm(
        "Are you sure you want to delete this experience record?"
    )) {
        return;
    }

    const items = [...getExperienceRecords()];

    if (!items[index]) return;

    items.splice(index, 1);

    try {
        await saveExperience(items);

        resetExperienceForm();

        showToast("Experience deleted successfully!");

    } catch (error) {
        console.error("Experience deletion error:", error);

        showToast(
            error.message || "Unable to delete experience."
        );
    }
}

// ---------------------------------------------------------
// EXPERIENCE BUTTON EVENTS
// ---------------------------------------------------------

document.getElementById("experienceAdminList")?.addEventListener(
    "click",
    event => {
        const edit = event.target.closest("[data-edit-experience]");
        const remove = event.target.closest("[data-delete-experience]");

        if (edit) {
            editExperience(Number(edit.dataset.editExperience));
        }

        if (remove) {
            deleteExperience(Number(remove.dataset.deleteExperience));
        }
    }
);

document.getElementById("cancelExperience")?.addEventListener(
    "click",
    resetExperienceForm
);

// ---------------------------------------------------------
// LOGOUT AND INITIALIZATION
// ---------------------------------------------------------

document.getElementById("adminYear")?.replaceChildren(
    document.createTextNode(String(new Date().getFullYear()))
);

document.getElementById("logoutButton")?.addEventListener(
    "click",
    async () => {
        try {
            const { error } = await db.auth.signOut();

            if (error) throw error;

            window.location.replace("login.html");

        } catch (error) {
            console.error("Logout error:", error);

            showToast(
                error.message || "Unable to sign out."
            );
        }
    }
);

/* =====================================
   ACHIEVEMENTS MANAGEMENT
   Stored in profiles.achievements (JSONB)
===================================== */

function getAchievementRecords() {
    return getArray(currentProfile?.achievements);
}


// RENDER ACHIEVEMENTS IN ADMIN DASHBOARD

function renderAchievementAdmin(items = []) {
    const container = document.getElementById("achievementAdminList");
    const count = document.getElementById("achievementCount");

    if (!container) return;

    items = getArray(items);

    if (count) {
        count.textContent =
            `${items.length} Record${items.length === 1 ? "" : "s"}`;
    }

    if (!items.length) {
        container.innerHTML = `
            <p class="empty-state">
                No achievements added yet.
            </p>
        `;
        return;
    }

    container.innerHTML = items.map((item, index) => `
        <article class="achievement-record">

            <h4>${escapeHTML(item.title || "Achievement")}</h4>

            <p>${escapeHTML(item.organization || "")}</p>

            ${
                item.date
                    ? `<small>${escapeHTML(item.date)}</small>`
                    : ""
            }

            <p>${escapeHTML(item.description || "")}</p>

            <div class="record-buttons">

                <button
                    type="button"
                    data-edit-achievement="${index}">
                    Edit
                </button>

                <button
                    type="button"
                    class="delete-button"
                    data-delete-achievement="${index}">
                    Delete
                </button>

            </div>

        </article>
    `).join("");
}


// RESET ACHIEVEMENT FORM

function resetAchievementForm() {
    document.getElementById("achievementForm")?.reset();

    const id = document.getElementById("achievementId");
    const title = document.getElementById("achievementFormTitle");
    const button = document.getElementById("achievementSaveButton");
    const cancel = document.getElementById("cancelAchievement");

    if (id) id.value = "";
    if (title) title.textContent = "Add Achievement";
    if (button) button.textContent = "Add Achievement";
    if (cancel) cancel.hidden = true;
}


// EDIT ACHIEVEMENT

function editAchievement(index) {
    const item = getAchievementRecords()[index];

    if (!item) return;

    document.getElementById("achievementId").value = index;

    document.getElementById("achievementTitle").value =
        item.title || "";

    document.getElementById("achievementOrganization").value =
        item.organization || "";

    document.getElementById("achievementDate").value =
        item.date || "";

    document.getElementById("achievementDescription").value =
        item.description || "";

    document.getElementById("achievementFormTitle").textContent =
        "Edit Achievement";

    document.getElementById("achievementSaveButton").textContent =
        "Update Achievement";

    document.getElementById("cancelAchievement").hidden = false;

    document.getElementById("achievementForm").scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}


// SAVE ACHIEVEMENTS TO SUPABASE

async function saveAchievements(items) {
    if (!(await hasAdminSession())) {
        throw new Error("Please sign in as administrator.");
    }

    const { data, error } = await db
        .from("profiles")
        .update({
            achievements: items,
            updated_at: new Date().toISOString()
        })
        .eq("singleton", true)
        .select()
        .single();

    if (error) throw error;

    currentProfile = data;

    renderAchievementAdmin(data.achievements);
}


// ADD OR UPDATE ACHIEVEMENT

document.getElementById("achievementForm")?.addEventListener(
    "submit",
    async event => {
        event.preventDefault();

        const button = document.getElementById("achievementSaveButton");

        const title = document
            .getElementById("achievementTitle")
            .value.trim();

        const organization = document
            .getElementById("achievementOrganization")
            .value.trim();

        const date = document
            .getElementById("achievementDate")
            .value.trim();

        const description = document
            .getElementById("achievementDescription")
            .value.trim();

        const editIndex = document
            .getElementById("achievementId")
            .value;

        if (!title) {
            showToast("Achievement title is required.");
            return;
        }

        const items = [...getAchievementRecords()];

        const record = {
            title,
            organization,
            date,
            description
        };

        if (editIndex !== "") {
            items[Number(editIndex)] = record;
        } else {
            items.push(record);
        }

        try {
            button.disabled = true;
            button.textContent = "Saving...";

            await saveAchievements(items);

            resetAchievementForm();

            showToast(
                editIndex !== ""
                    ? "Achievement updated successfully!"
                    : "Achievement added successfully!"
            );

        } catch (error) {
            console.error("Achievement save error:", error);

            showToast(
                error.message || "Unable to save achievement."
            );

        } finally {
            button.disabled = false;
            button.textContent = "Add Achievement";
        }
    }
);


// DELETE ACHIEVEMENT

async function deleteAchievement(index) {
    if (!window.confirm(
        "Are you sure you want to delete this achievement?"
    )) {
        return;
    }

    const items = [...getAchievementRecords()];

    if (!items[index]) return;

    items.splice(index, 1);

    try {
        await saveAchievements(items);

        resetAchievementForm();

        showToast("Achievement deleted successfully!");

    } catch (error) {
        console.error("Achievement deletion error:", error);

        showToast(
            error.message || "Unable to delete achievement."
        );
    }
}


// ACHIEVEMENT BUTTON EVENTS

document.getElementById("achievementAdminList")?.addEventListener(
    "click",
    event => {
        const edit = event.target.closest("[data-edit-achievement]");
        const remove = event.target.closest("[data-delete-achievement]");

        if (edit) {
            editAchievement(Number(edit.dataset.editAchievement));
        }

        if (remove) {
            deleteAchievement(Number(remove.dataset.deleteAchievement));
        }
    }
);


// CANCEL EDIT

document.getElementById("cancelAchievement")?.addEventListener(
    "click",
    resetAchievementForm
);

/* =====================================
   CONTACT DETAILS MANAGEMENT
===================================== */

function loadContactDetails() {
    if (!currentProfile) return;

    document.getElementById("phone").value =
        currentProfile.phone || "0542044490";

    document.getElementById("whatsapp").value =
        currentProfile.whatsapp || "233542044490";

    document.getElementById("email").value =
        currentProfile.email || "";

    document.getElementById("website").value =
        currentProfile.website || "";
}


/* =====================================
   SAVE CONTACT DETAILS
===================================== */

document.getElementById("contactForm")?.addEventListener(
    "submit",
    async event => {
        event.preventDefault();

        const button = event.submitter ||
            document.querySelector("#contactForm button[type='submit']");

        const phone = document.getElementById("phone").value.trim();
        const whatsapp = document.getElementById("whatsapp").value.trim();
        const email = document.getElementById("email").value.trim();
        const website = document.getElementById("website").value.trim();

        if (!phone || !whatsapp) {
            showToast("Phone and WhatsApp numbers are required.");
            return;
        }

        if (website && !/^https?:\/\/.+/i.test(website)) {
            showToast("Enter a valid website URL beginning with https://");
            return;
        }

        try {
            if (button) {
                button.disabled = true;
                button.textContent = "Saving...";
            }

            if (!(await hasAdminSession())) {
                throw new Error("Please sign in as administrator.");
            }

            const { data, error } = await db
                .from("profiles")
                .update({
                    phone,
                    whatsapp,
                    email,
                    website,
                    updated_at: new Date().toISOString()
                })
                .eq("singleton", true)
                .select()
                .single();

            if (error) throw error;

            currentProfile = data;

            showToast("Contact details updated successfully!");

        } catch (error) {
            console.error("Contact update error:", error);

            showToast(error.message || "Unable to update contact details.");

        } finally {
            if (button) {
                button.disabled = false;
                button.textContent = "Save Contact Details";
            }
        }
    }
);

/* =====================================
   SOCIAL MEDIA MANAGEMENT
   Stored in profiles.social_links (JSONB)
===================================== */

function loadSocialLinks() {
    if (!currentProfile) return;

    const links = currentProfile.social_links || {};

    document.getElementById("facebook").value =
        links.facebook || "";

    document.getElementById("instagram").value =
        links.instagram || "";

    document.getElementById("linkedin").value =
        links.linkedin || "";

    document.getElementById("twitter").value =
        links.twitter || "";
}


/* =====================================
   SAVE SOCIAL MEDIA LINKS
===================================== */

document.getElementById("social")?.addEventListener(
    "click",
    () => {
        loadSocialLinks();
    }
);

document.querySelector("#social .primary-button")?.addEventListener(
    "click",
    async event => {
        event.preventDefault();

        const button = event.currentTarget;

        const links = {
            facebook: document.getElementById("facebook").value.trim(),
            instagram: document.getElementById("instagram").value.trim(),
            linkedin: document.getElementById("linkedin").value.trim(),
            twitter: document.getElementById("twitter").value.trim()
        };

        for (const [platform, url] of Object.entries(links)) {
            if (url && !/^https?:\/\/.+/i.test(url)) {
                showToast(
                    `Enter a valid ${platform} URL beginning with https://`
                );
                return;
            }
        }

        try {
            button.disabled = true;
            button.textContent = "Saving...";

            if (!(await hasAdminSession())) {
                throw new Error("Please sign in as administrator.");
            }

            const { data, error } = await db
                .from("profiles")
                .update({
                    social_links: links,
                    updated_at: new Date().toISOString()
                })
                .eq("singleton", true)
                .select()
                .single();

            if (error) throw error;

            currentProfile = data;

            showToast("Social media links saved successfully!");

        } catch (error) {
            console.error("Social links error:", error);

            showToast(
                error.message || "Unable to save social media links."
            );

        } finally {
            button.disabled = false;
            button.textContent = "Save Social Links";
        }
    }
);

/* =====================================
   APPEARANCE SETTINGS
   SUPABASE JSONB STORAGE
===================================== */

const defaultAppearance = {
    showProfileImage: true,
    showBiography: true,
    showEducation: true,
    showExperience: true,
    showAchievements: true,
    showSocial: true
};


// LOAD SETTINGS INTO DASHBOARD

function loadAppearanceSettings() {
    const settings = {
        ...defaultAppearance,
        ...(currentProfile?.appearance || {})
    };

    Object.entries(settings).forEach(([key, value]) => {
        const checkbox = document.getElementById(key);

        if (checkbox) {
            checkbox.checked = Boolean(value);
        }
    });
}


// SAVE SETTINGS TO SUPABASE

document.getElementById("appearanceForm")?.addEventListener(
    "submit",
    async event => {
        event.preventDefault();

        const button = event.submitter;

        const settings = {};

        Object.keys(defaultAppearance).forEach(key => {
            settings[key] = document.getElementById(key).checked;
        });

        try {
            button.disabled = true;
            button.textContent = "Saving...";

            if (!(await hasAdminSession())) {
                throw new Error("Please sign in as administrator.");
            }

            const { data, error } = await db
                .from("profiles")
                .update({
                    appearance: settings,
                    updated_at: new Date().toISOString()
                })
                .eq("singleton", true)
                .select()
                .single();

            if (error) throw error;

            currentProfile = data;

            showToast("Appearance settings saved successfully!");

        } catch (error) {
            console.error("Appearance settings error:", error);

            showToast(
                error.message || "Unable to save appearance settings."
            );

        } finally {
            button.disabled = false;
            button.textContent = "Save Appearance Settings";
        }
    }
);

// =====================================
// WEBSITE LOGO MANAGEMENT
// =====================================

const logoInput = document.getElementById("logoInput");
const logoPreview = document.getElementById("logoPreview");
const logoForm = document.getElementById("logoForm");

let selectedLogoFile = null;

// Load existing logo
// Load existing logo in dashboard preview and sidebar
function loadLogo() {
    const adminLogo = document.getElementById("adminSidebarLogo");
    const adminFallback = document.getElementById("adminSidebarLogoFallback");

    if (currentProfile?.logo_url) {

        // Dashboard logo preview
        if (logoPreview) {
            logoPreview.src = currentProfile.logo_url;
            logoPreview.style.display = "block";
        }

        // Admin sidebar logo
        if (adminLogo && adminFallback) {
            adminLogo.src = currentProfile.logo_url;
            adminLogo.hidden = false;
            adminFallback.hidden = true;
        }

    } else {

        // Show EA fallback if no logo exists
        if (adminLogo && adminFallback) {
            adminLogo.hidden = true;
            adminFallback.hidden = false;
        }
    }
}

// Preview selected logo
logoInput?.addEventListener("change", function () {
    const file = this.files[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
        showToast("Please select a valid image.");
        return;
    }

    selectedLogoFile = file;

    logoPreview.src = URL.createObjectURL(file);
    logoPreview.style.display = "block";
});

// Upload and save logo
logoForm?.addEventListener("submit", async function (event) {
    event.preventDefault();

    const button = document.getElementById("saveLogo");

    if (!selectedLogoFile) {
        showToast("Please select a logo first.");
        return;
    }

    try {
        button.disabled = true;
        button.textContent = "Uploading...";

        if (!(await hasAdminSession())) {
            throw new Error("Administrator access required.");
        }

        const fileExtension = selectedLogoFile.name.split(".").pop();
        const filePath = `website-logo-${Date.now()}.${fileExtension}`;

        // Upload logo to Supabase Storage
        const { error: uploadError } = await db.storage
            .from("profile-images")
            .upload(filePath, selectedLogoFile, {
                cacheControl: "3600",
                upsert: false
            });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = db.storage
            .from("profile-images")
            .getPublicUrl(filePath);

        const logoURL = urlData.publicUrl;

        // Save logo URL in profiles table
        const { data, error } = await db
            .from("profiles")
            .update({
                logo_url: logoURL,
                updated_at: new Date().toISOString()
            })
            .eq("singleton", true)
            .select()
            .single();

        if (error) throw error;

        currentProfile = data;
        selectedLogoFile = null;
        logoInput.value = "";

        loadLogo();

        showToast("Website logo uploaded successfully!");

    } catch (error) {
        console.error("Logo upload error:", error);
        showToast(error.message || "Logo upload failed.");
    } finally {
        button.disabled = false;
        button.textContent = "Upload Logo";
    }
});
// Load the profile after admin.js has been loaded
// by the protected dashboard.
loadProfile();
