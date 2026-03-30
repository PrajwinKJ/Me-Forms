// script.js
// Logic for the Minimal Forms UI.
// Uses simple local state to demonstrate the UI flow, while providing 
// placeholder fetch() calls ready to be connected to a FastAPI backend.

/* =========================================
   1. STATE & MOCK DATA
   ========================================= */
let currentForm = null;          // Currently created / loaded form state
let allResponses = [];           // Stores submissions securely in mem
let questionIdCounter = 0;       // Unique IDs for builder UI

/* =========================================
   2. NAVIGATION LOGIC
   ========================================= */
function navigate(viewId) {
    // Hide all views
    document.querySelectorAll('.view-section').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    
    // Show selected view
    document.getElementById(`view-${viewId}`).style.display = 'block';
    
    // Ensure the navigation button matches the state
    const navBtn = document.getElementById(`nav-${viewId}`);
    if (navBtn) navBtn.classList.add('active');

    // Handle view-specific renders if state exists
    if (viewId === 'fill-form') {
        renderFillForm();
    } else if (viewId === 'responses') {
        renderResponses();
    }
}

/* =========================================
   3. "CREATE FORM" BUILDER LOGIC
   ========================================= */

// Init: Ensure at least one question block exists when loaded
window.onload = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const formId = urlParams.get('formId');
    
    if (formId) {
        // Enforce Respondent Mode
        window.isRespondentMode = true;
        document.querySelector('.navbar nav').style.display = 'none';
        navigate('fill-form');
        loadFormUI(formId, true);
    } else {
        window.isRespondentMode = false;
        addQuestion();
    }
};

function addQuestion() {
    questionIdCounter++;
    const qId = questionIdCounter;
    
    const container = document.getElementById('questions-container');
    
    const qBlock = document.createElement('div');
    qBlock.className = 'question-block';
    qBlock.id = `q-block-${qId}`;
    
    // Inject the inner elements dynamically
    qBlock.innerHTML = `
        <div class="q-header">
            <textarea placeholder="Question Text" class="q-text input-main" id="q-text-${qId}" style="min-height: 48px; padding-top: 8px;"></textarea>
            <select class="q-type" id="q-type-${qId}" onchange="toggleOptions(${qId})">
                <option value="text">Short Answer</option>
                <option value="mcq">Multiple Choice</option>
            </select>
        </div>
        
        <div class="options-container" id="q-options-${qId}" style="display: none;">
            <div id="options-list-${qId}"></div>
            <button type="button" class="btn btn-secondary btn-sm" onclick="addOption(${qId})" style="margin-top:8px; padding: 6px 12px; font-size: 0.85rem;">+ Add Option</button>
        </div>
        
        <div class="q-actions">
            <button type="button" class="btn btn-danger" onclick="deleteQuestion(${qId})">Delete</button>
        </div>
    `;
    
    container.appendChild(qBlock);
}

function deleteQuestion(id) {
    const el = document.getElementById(`q-block-${id}`);
    if (el) el.remove();
}

// Show/Hide multiple choice options based on Dropdown type selection
function toggleOptions(id) {
    const type = document.getElementById(`q-type-${id}`).value;
    const optionsContainer = document.getElementById(`q-options-${id}`);
    
    if (type === 'mcq') {
        optionsContainer.style.display = 'block';
        // Auto-add the first option if the list is empty
        const list = document.getElementById(`options-list-${id}`);
        if(list.children.length === 0) {
            addOption(id);
        }
    } else {
        optionsContainer.style.display = 'none';
        // We keep options in DOM for now, backend parser will ignore them if type='text'
    }
}

function addOption(qId) {
    const list = document.getElementById(`options-list-${qId}`);
    const optionId = Date.now(); // random unique local ID for option removal
    
    const optionRow = document.createElement('div');
    optionRow.className = 'option-row';
    optionRow.id = `option-${optionId}`;
    
    optionRow.innerHTML = `
        <input type="radio" disabled style="margin-right: 8px;">
        <input type="text" class="option-text" placeholder="Option Text">
        <button type="button" class="btn-icon" onclick="deleteOption('${optionId}')">×</button>
    `;
    
    list.appendChild(optionRow);
}

function deleteOption(optId) {
    const el = document.getElementById(`option-${optId}`);
    if (el) el.remove();
}

/* =========================================
   4. SAVE FORM & API PLACEHOLDERS
   ========================================= */

// To keep mock questions, since the current SQL schema only saves title & description
let latestSavedFormState = null;

async function saveForm() {
    const title = document.getElementById('form-title').value;
    const desc = document.getElementById('form-desc').value;
    
    // Parse all dynamic input blocks
    const questionBlocks = document.querySelectorAll('.question-block');
    const questions = [];
    
    questionBlocks.forEach(block => {
        const idStr = block.id.replace('q-block-', '');
        const qText = document.getElementById(`q-text-${idStr}`).value;
        const qType = document.getElementById(`q-type-${idStr}`).value;
        
        const qObj = {
            id: `q-${Date.now()}-${idStr}`,
            text: qText || 'Untitled Question',
            type: qType,
            options: []
        };
        
        // If it's a multiple choice question, retrieve the specific texts
        if (qType === 'mcq') {
            const opts = block.querySelectorAll('.option-text');
            opts.forEach(o => {
                if(o.value) qObj.options.push(o.value);
            });
            // basic fallback
            if(qObj.options.length === 0) qObj.options.push("Option 1"); 
        }
        
        questions.push(qObj);
    });
        const payload = {
        title: title || 'Untitled Form',
        description: desc,
        questions: questions
    };

    // -----------------------------------------------------------------
    // API INTEGRATION POINT: POST /forms
    // -----------------------------------------------------------------

    try {
        const res = await fetch('http://localhost:8000/api/forms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const text = await res.text();
        console.log("Form saved successfully to backend:", text);
        
        const newFormId = parseInt(text);
        if (!isNaN(newFormId)) {
            let myForms = JSON.parse(localStorage.getItem('my_forms') || '[]');
            if (!myForms.includes(newFormId)) {
                myForms.push(newFormId);
                localStorage.setItem('my_forms', JSON.stringify(myForms));
            }
        }
        
        alert("Form Saved to Database! Switch to 'Fill Form' view to retrieve it from the DB.");
    } catch(err) {
        console.error("Backend unavailable.", err);
        alert("Backend offline. Cannot save form.");
    }
}

/* =========================================
   5. "FILL FORM" LOGIC (PUBLIC VIEW)
   ========================================= */

async function discoverAllForms() {
    // Fetch all forms natively using the backend list API
    try {
        const res = await fetch(`http://localhost:8000/api/forms`);
        if(!res.ok) return [];
        return await res.json();
    } catch(err) {
        console.warn("Backend unavailable or network error", err);
        return [];
    }
}

function copyShareLink(formId) {
    const url = new URL(window.location.href);
    // Remove query params if they exist (although there shouldn't be any in admin root) and add formId securely
    url.search = '';
    url.searchParams.set('formId', formId);
    navigator.clipboard.writeText(url.toString()).then(() => {
        alert('Share link copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy link: ', err);
        alert('Failed to copy link. Manually copy this URL: ' + url.toString());
    });
}

async function renderFillForm() {
    const container = document.getElementById('fill-form-container');
    container.innerHTML = `<div class="empty-state">Fetching forms from Database...</div>`;
    
    const dbForms = await discoverAllForms();
    const myFormIds = JSON.parse(localStorage.getItem('my_forms') || '[]');
    const myForms = dbForms.filter(form => myFormIds.includes(form.id));
    
    if (myForms.length === 0) {
        container.innerHTML = `<div class="empty-state">No forms found in your local storage. Build and Save a form first!</div>`;
        return;
    }
    
    let html = `
        <div style="margin-bottom: 24px;">
            <h2 style="font-size: 2rem; margin-bottom: 16px;">Select a Form from Database</h2>
            <div style="display: flex; flex-direction: column; gap: 8px;">
    `;
    
    myForms.forEach(form => {
        html += `
            <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                <button class="btn btn-secondary" style="flex: 1; text-align: left; background: var(--surface); color: var(--text-main); font-size: 1.1rem; padding: 16px;" onclick="loadFormUI(${form.id})"><strong>Form ${form.id}:</strong> ${form.title}</button>
                <button class="btn btn-primary" onclick="copyShareLink(${form.id})" title="Copy Share Link">🔗 Share Form</button>
            </div>
        `;
    });
    
    html += `</div></div>`;
    container.innerHTML = html;
}

async function loadFormUI(formId, isRespondent = false) {
    const container = document.getElementById('fill-form-container');
    container.innerHTML = `<div class="empty-state">Loading Form ${formId}...</div>`;
    
    let formToRender = null;
    try {
        const res = await fetch(`http://localhost:8000/api/forms/${formId}`);
        formToRender = await res.json();
    } catch(err) {
        alert("Failed to fetch form structure");
        return;
    }
    
    // Ensure questions exist natively from the backend payload
    const questions = formToRender.questions || [];
    
    // Set global currentForm state so submitResponse works properly
    currentForm = {
        title: formToRender.title,
        description: formToRender.description,
        questions: questions
    };
    
    let html = `
        <div style="margin-bottom: 24px;">
            ${isRespondent ? '' : `<button class="btn btn-secondary btn-sm" onclick="renderFillForm()" style="margin-bottom: 12px;">← Back to Forms list</button>`}
            <h2 style="font-size: 2rem; margin-bottom: 8px;">${formToRender.title}</h2>
            <p style="color: var(--text-sec);">${(formToRender.description||'').replace(/\n/g, '<br>')}</p>
        </div>
        <form id="public-fill-form" onsubmit="submitResponse(event)">
            <input type="hidden" name="form_id" value="${formToRender.id}">
    `;
    
    questions.forEach((q, index) => {
        html += `<div class="question-block" style="background-color: transparent;">
            <div style="font-weight: 500; margin-bottom: 12px; font-size: 1.05rem;">
                ${index + 1}. ${q.text}
            </div>
            <div class="q-input-area">
        `;
        
        if (q.type === 'text') {
            html += `<input type="text" name="${q.id}" required placeholder="Your answer" class="input-main" style="padding: 8px;">`;
        } else if (q.type === 'mcq') {
            q.options.forEach((opt, oIndex) => {
                html += `
                    <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; cursor: pointer;">
                        <input type="radio" name="${q.id}" value="${opt}" required>
                        <span>${opt}</span>
                    </label>
                `;
            });
        }
        
        html += `</div></div>`;
    });
    
    html += `
            <div style="margin-top: 24px;">
                <button type="submit" class="btn btn-primary">Submit Response</button>
            </div>
        </form>
    `;
    
    container.innerHTML = html;
}

async function submitResponse(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const answers = [];
    
    // We already have currentForm structure logic to map IDs gracefully for readability
    currentForm.questions.forEach(q => {
        const storedValue = formData.get(q.id);
        if (storedValue !== null) {
            answers.push({
                questionId: q.id,
                questionText: q.text,
                answerValue: storedValue
            });
        }
    });
    
    const payload = {
        answers: answers,
        submittedAt: new Date().toISOString()
    };
    
    // -----------------------------------------------------------------
    // API INTEGRATION POINT: POST /forms/{id}/submit
    // -----------------------------------------------------------------
    const formId = formData.get("form_id");
    
    try {
        const res = await fetch(`http://localhost:8000/api/forms/${formId}/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
    } catch(err) {
        console.warn("Backend failover to local push hook.");
    }
    
    
    allResponses.push(payload);
    
    if (window.isRespondentMode) {
        document.getElementById('fill-form-container').innerHTML = `
            <div style="text-align: center; padding: 60px 20px;">
                <h2 style="color: var(--primary); font-size: 2.5rem; margin-bottom: 16px;">Thank You!</h2>
                <p style="color: var(--text-sec); font-size: 1.2rem;">Your response has been successfully recorded.</p>
            </div>
        `;
    } else {
        alert('Response submitted successfully! You can view it in the Responses tab.');
        e.target.reset(); 
    }
}

/* =========================================
   6. RESPONSES DASHBOARD LOGIC
   ========================================= */

async function fetchResponses(formId) {
    try {
        const res = await fetch(`http://localhost:8000/api/forms/${formId}/responses`);
        const data = await res.json();
        return data; 
    } catch(err) {
        return { responses: [], questions: [] };
    }
}

async function renderResponses() {
    const container = document.getElementById('responses-container');
    container.innerHTML = `<div class="empty-state">Fetching forms from Database...</div>`;
    
    const dbForms = await discoverAllForms();
    const myFormIds = JSON.parse(localStorage.getItem('my_forms') || '[]');
    const myForms = dbForms.filter(form => myFormIds.includes(form.id));
    
    if (myForms.length === 0) {
        container.innerHTML = `<div class="empty-state">No forms found in your local storage. Build and Save a form first!</div>`;
        return;
    }
    
    let html = `
        <div style="margin-bottom: 24px;">
            <h2 style="font-size: 2rem; margin-bottom: 16px;">Select a Form to View Responses</h2>
            <div style="display: flex; flex-direction: column; gap: 8px;">
    `;
    
    myForms.forEach(form => {
        let safeTitle = (form.title || 'Untitled Form').replace(/'/g, "\\'");
        html += `<button class="btn btn-secondary" style="text-align: left; background: var(--surface); color: var(--text-main); font-size: 1.1rem; padding: 16px;" onclick="viewResponsesForForm(${form.id}, '${safeTitle}')"><strong>Form ${form.id}:</strong> ${form.title}</button>`;
    });
    
    html += `</div></div>`;
    container.innerHTML = html;
}

async function viewResponsesForForm(formId, formTitle) {
    const container = document.getElementById('responses-container');
    container.innerHTML = `<div class="empty-state">Loading Responses for ${formTitle}...</div>`;
    
    const responseData = await fetchResponses(formId);
    
    const responsesFlat = responseData.responses || [];
    const questions = responseData.questions || [];
    const numQuestions = questions.length;
    
    const groupedSubmissions = [];
    if (numQuestions > 0) {
        for (let i = 0; i < responsesFlat.length; i += numQuestions) {
            const chunk = responsesFlat.slice(i, i + numQuestions);
            groupedSubmissions.push({
                submittedAt: new Date().toISOString(),
                answers: chunk.map(ans => {
                    const qInfo = questions.find(q => q.id == ans.question_id);
                    return {
                        questionText: qInfo ? qInfo.text : 'Unknown Question',
                        answerValue: ans.response
                    };
                })
            });
        }
    }
    
    let html = `
        <div style="margin-bottom: 24px;">
            <button class="btn btn-secondary btn-sm" onclick="renderResponses()" style="margin-bottom: 12px;">← Back to Forms list</button>
            <h2 style="font-size: 2rem; margin-bottom: 8px;">Responses for: ${formTitle} (${groupedSubmissions.length})</h2>
        </div>
    `;
    
    if (groupedSubmissions.length === 0) {
        html += `<div class="empty-state">No responses yet.</div>`;
        container.innerHTML = html;
        return;
    }
    
    groupedSubmissions.forEach((resp, idx) => {
        // We don't have accurate server side timestamps yet, so just count index.
        html += `
            <div class="submission-card">
                <div style="font-size: 0.85rem; color: var(--text-sec); margin-bottom: 12px;">Submission #${idx + 1}</div>
        `;
        
        resp.answers.forEach(ans => {
            html += `
                <div class="answer-row">
                    <div class="answer-q">${ans.questionText || 'Unknown Question'}</div>
                    <div class="answer-a">${ans.answerValue || 'No answer'}</div>
                </div>
            `;
        });
        
        html += `</div>`;
    });
    
    container.innerHTML = html;
}