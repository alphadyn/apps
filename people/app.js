/* global supabase */
(() => {
  const $ = (selector) => document.querySelector(selector);
  const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const safeUrl = (value) => {
    try {
      const url = new URL(value);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch { return ''; }
  };
  const sampleProfiles = [
    { id: 'sample-1', name: 'Alexandra Morgan', headline: 'Product Designer · Making the complex feel simple', location: 'Brooklyn, New York', about: "I'm a product designer who believes the best work starts with curiosity and a little empathy. I bring ideas to life at the intersection of thoughtful design, emerging technology, and real human needs.\n\nCurrently exploring new ways to make digital experiences feel a little more human. Always up for a good conversation, a creative collaboration, or a coffee.", skills: 'Product Design, Design Strategy, User Research, Prototyping, Creative Direction', experience: 'Senior Product Designer · Studio North\n2021 — Present\nDesigning thoughtful digital products for ambitious teams.\n\nProduct Designer · Fieldwork\n2018 — 2021', education: 'BFA, Communication Design · Parsons School of Design', avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=240&q=80' },
    { id: 'sample-2', name: 'Daniel Kim', headline: 'Creative Director at Studio North', location: 'New York, NY', about: 'Creative direction, identity, and ideas with a human point of view.', skills: 'Creative Direction, Branding', experience: 'Creative Director · Studio North', education: '', avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=160&q=80' },
    { id: 'sample-3', name: 'Priya Shah', headline: 'Founder & Brand Strategist', location: 'San Francisco, CA', about: 'Helping thoughtful teams build brands that make a difference.', skills: 'Strategy, Branding', experience: 'Founder · Common Ground', education: '', avatar_url: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=160&q=80' },
    { id: 'sample-4', name: 'Marcus Chen', headline: 'Product Lead at Fable', location: 'Seattle, WA', about: 'Building useful products alongside good people.', skills: 'Product Management, Leadership', experience: 'Product Lead · Fable', education: '', avatar_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=160&q=80' },
    { id: 'sample-5', name: 'Sophie Laurent', headline: 'Independent Art Director', location: 'London, UK', about: 'Art direction and visual storytelling for a brighter future.', skills: 'Art Direction, Photography', experience: 'Independent Art Director', education: '', avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=160&q=80' }
  ];
  const sampleGallery = [
    { id: 's1', owner_id: 'sample-1', title: 'The Gather Project', description: 'BRAND IDENTITY · 2024', image_url: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=500&q=80' },
    { id: 's2', owner_id: 'sample-1', title: 'A little more human', description: 'DIGITAL EXPERIENCE · 2023', image_url: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=500&q=80' },
    { id: 's3', owner_id: 'sample-1', title: 'Objects & spaces', description: 'PERSONAL PROJECT · 2023', image_url: 'https://images.unsplash.com/photo-1449247709967-d4461a6a6103?auto=format&fit=crop&w=500&q=80' }
  ];
  const sampleCommunities = [
    { id: 'community-design', name: 'Design for Good', description: 'For thoughtful designers creating a more human world.' },
    { id: 'community-founders', name: 'The Founders Circle', description: 'A place to share ideas and learn from other builders.' },
    { id: 'community-creative', name: 'Creative Exchange', description: 'Inspiration, collaboration, and honest conversations about creative work.' }
  ];
  const sampleMembers = [
    { community_id: 'community-design', user_id: 'sample-1' },
    { community_id: 'community-design', user_id: 'sample-2' },
    { community_id: 'community-founders', user_id: 'sample-3' },
    { community_id: 'community-creative', user_id: 'sample-5' }
  ];
  const samplePosts = [
    { id: 'sample-post', community_id: 'community-design', author_id: 'sample-1', body: 'What is one small detail that made a product feel more human to you lately?', created_at: '2026-11-10T12:00:00Z' }
  ];
  const config = window.PEOPLE_CONFIG || {};
  const configured = Boolean(config.url && config.anonKey);
  const client = configured && window.supabase ? supabase.createClient(config.url, config.anonKey) : null;
  const state = { user: null, own: null, profiles: configured ? [] : sampleProfiles, gallery: [], view: 'profile', selected: null, thread: null, messages: [], search: '', communities: [], communityId: null, communityMembers: [], communityPosts: [] };
  const content = $('#content');
  const dialog = $('#dialog');
  const icon = (id) => `<svg aria-hidden="true"><use href="#i-${id}"></use></svg>`;
  const avatar = (profile, className = 'avatar') => safeUrl(profile.avatar_url)
    ? `<img class="${className}" src="${escape(safeUrl(profile.avatar_url))}" alt="">`
    : `<span class="${className}" aria-hidden="true">${escape((profile.name || '?').charAt(0).toUpperCase())}</span>`;
  const notice = (message, error = false) => { $('#status').innerHTML = message ? `<div class="notice${error ? ' error' : ''}">${escape(message)}</div>` : ''; };
  const showError = (error) => notice(error?.message || String(error), true);
  const check = ({ data, error }) => { if (error) throw error; return data; };
  const intro = (eyebrow, title, description) => `<div class="page-intro"><div><span class="eyebrow">${eyebrow}</span><h1>${title}</h1><p>${description}</p></div><div class="page-date"><span>✳</span> A LITTLE SPACE TO BE YOU</div></div>`;
  const currentProfile = () => state.profiles.find((p) => p.id === state.selected) || state.own || (!configured ? sampleProfiles[0] : null);
  const isOwn = (profile) => Boolean(state.user && profile?.id === state.user.id);
  const skills = (profile) => (profile.skills || '').split(',').map((skill) => skill.trim()).filter(Boolean);

  function openDialog(title, html, eyebrow = 'PEOPLE') {
    $('#dialog-title').textContent = title;
    $('#dialog-eyebrow').textContent = eyebrow;
    $('#dialog-content').innerHTML = html;
    if (!dialog.open) dialog.showModal();
  }
  function authDialog(mode = 'signin') {
    if (!client) return notice(configured ? 'The Supabase library could not be loaded. Check your connection and reload.' : 'Live accounts are not configured yet. Follow the setup instructions in the app README.', true);
    const signup = mode === 'signup';
    openDialog(signup ? 'Join People' : 'Welcome back', `<form id="auth-form" class="form-grid">
      ${signup ? '<label class="field full">Your name<input name="name" required maxlength="100" autocomplete="name"></label>' : ''}
      <label class="field full">Email<input type="email" name="email" required autocomplete="email"></label>
      <label class="field full">Password<input type="password" name="password" required minlength="6" autocomplete="${signup ? 'new-password' : 'current-password'}"></label>
      <div class="field full"><p class="form-help">${signup ? 'Use a real email address. You may need to confirm it before signing in.' : 'Sign in to edit your profile and message people.'}</p><p class="dialog-error" role="alert"></p><div class="form-actions"><button class="button primary" type="submit">${signup ? 'Create account' : 'Sign in'}</button><button class="form-switch" type="button" data-auth-switch="${signup ? 'signin' : 'signup'}">${signup ? 'Already a member? Sign in' : 'New here? Create an account'}</button></div></div>
    </form>`, 'YOUR PROFESSIONAL HOME');
  }
  function profileForm(profile = {}) {
    const field = (label, name, max, options = {}) => `<label class="field ${options.full ? 'full' : ''}">${label}${options.textarea ? `<textarea name="${name}" maxlength="${max}">${escape(profile[name] || '')}</textarea>` : `<input name="${name}" maxlength="${max}" value="${escape(profile[name] || '')}" ${options.required ? 'required' : ''} ${options.type ? `type="${options.type}"` : ''}>`}</label>`;
    openDialog('Tell your story', `<form id="profile-form" class="form-grid">
      ${field('Full name', 'name', 100, { required: true })}${field('Headline', 'headline', 180)}
      ${field('Location', 'location', 120)}${field('Profile photo URL', 'avatar_url', 2000, { type: 'url' })}
      ${field('About', 'about', 3000, { full: true, textarea: true })}${field('Skills (comma separated)', 'skills', 500, { full: true })}
      ${field('Experience', 'experience', 5000, { full: true, textarea: true })}${field('Education', 'education', 3000, { full: true, textarea: true })}
      ${field('Resume / CV URL', 'cv_url', 2000, { type: 'url' })}${field('Public contact email', 'contact_email', 254, { type: 'email' })}
      ${field('Public phone number', 'contact_phone', 40)}
      <div class="field full"><p class="form-help">Your profile, gallery, contact email, and phone number are public. Leave contact fields blank to keep them private. Use a public HTTP(S) link for your photo and CV.</p><p class="dialog-error" role="alert"></p><div class="form-actions"><button class="button primary" type="submit">Save profile</button></div></div>
    </form>`, 'YOUR PROFILE');
  }
  function galleryForm() {
    openDialog('Add to your gallery', `<form id="gallery-form" class="form-grid">
      <label class="field full">Project title<input name="title" maxlength="120" required></label>
      <label class="field full">Public image URL<input name="image_url" type="url" maxlength="2000" required></label>
      <label class="field full">Description<input name="description" maxlength="500"></label>
      <div class="field full"><p class="form-help">Add a public HTTP(S) image link. Gallery items are visible to everyone.</p><p class="dialog-error" role="alert"></p><div class="form-actions"><button class="button primary" type="submit">Add project</button></div></div>
    </form>`, 'YOUR WORK');
  }
  function communityForm() {
    openDialog('Create a community', `<form id="community-form" class="form-grid">
      <label class="field full">Community name<input name="name" maxlength="100" required></label>
      <label class="field full">What brings your community together?<textarea name="description" maxlength="1000"></textarea></label>
      <div class="field full"><p class="form-help">Communities, members, and posts are public. You will automatically join your new community.</p><p class="dialog-error" role="alert"></p><div class="form-actions"><button class="button primary" type="submit">Create community</button></div></div>
    </form>`, 'BRING PEOPLE TOGETHER');
  }
  function requireProfile() {
    if (!state.user) { authDialog(); return false; }
    if (!state.own) { profileForm({ name: state.user.user_metadata?.name || '' }); return false; }
    return true;
  }
  function person(profile) {
    return `<div class="person">${avatar(profile, 'person-avatar')}<div class="person-info"><strong>${escape(profile.name)}</strong><span>${escape(profile.headline || profile.location || 'People member')}</span></div><button data-profile="${escape(profile.id)}" aria-label="View ${escape(profile.name)}'s profile">↗</button></div>`;
  }
  function profileView() {
    const profile = currentProfile();
    if (!profile) return `${intro('YOUR SPACE', 'Your story starts here.', 'A little space for the work and people that matter.')}<div class="card section-card"><h2>Make yourself at home.</h2><p class="empty">${state.user ? 'Create your profile to introduce yourself to the community.' : 'Sign in to create your profile, meet people, and start conversations.'}</p><button class="button primary" data-action="${state.user ? 'edit' : 'signin'}">${state.user ? 'Create profile' : 'Sign in or join'}</button></div>`;
    const own = isOwn(profile);
    const gallery = configured ? state.gallery : sampleGallery.filter((item) => item.owner_id === profile.id);
    const others = state.profiles.filter((p) => p.id !== profile.id).slice(0, 4);
    const cv = safeUrl(profile.cv_url);
    return `${intro(own ? 'A SPACE THAT’S ALL YOURS' : 'A LITTLE INTRODUCTION', own ? 'Your story, all in one place.' : escape(profile.name) + '’s story.', 'The people, projects, and possibilities that make work meaningful.')}
      <div class="layout"><div class="stack">
        <section class="card"><div class="cover"><span class="cover-label">MAKE YOUR MARK &nbsp; ✳</span></div><div class="profile-body">
          <div class="profile-top">${avatar(profile)}<div class="profile-actions">${own ? `<button class="button" data-action="edit">${icon('edit')} Edit profile</button>` : `<button class="button primary" data-action="message" data-id="${escape(profile.id)}">${icon('message')} Message</button>`}${cv ? `<a class="button" href="${escape(cv)}" target="_blank" rel="noopener noreferrer">${icon('file')} Resume / CV ↗</a>` : ''}</div></div>
          <div class="profile-name"><h2>${escape(profile.name)}</h2><span class="verified" title="People member">✳</span></div><p class="headline">${escape(profile.headline || 'People member')}</p><div class="location">${icon('pin')} ${escape(profile.location || 'Location not added')}</div>
          <div class="profile-bottom"><div class="stat"><strong>${skills(profile).length}</strong><span>Skills & interests</span></div><div class="stat"><strong>${gallery.length}</strong><span>Gallery projects</span></div><span class="open-tag">Here to connect</span></div>
        </div></section>
        <section class="card section-card"><div class="section-header"><div><span class="section-index">01 / THE INTRODUCTION</span><h2>About me</h2></div>${own ? '<button class="section-action" data-action="edit">Edit about ↗</button>' : ''}</div><div class="about-copy">${escape(profile.about || 'No introduction added yet.')}</div><div class="skill-list">${skills(profile).map((skill) => `<span class="skill">${escape(skill)}</span>`).join('')}</div></section>
        <section class="card section-card" id="experience"><div class="section-header"><div><span class="section-index">02 / THE JOURNEY</span><h2>Experience & education</h2><p>A little of where I’ve been.</p></div>${own ? '<button class="section-action" data-action="edit">Edit resume ↗</button>' : ''}</div><div class="experience-item"><div class="experience-icon">✳</div><div class="experience-copy">${escape(profile.experience || 'No experience added yet.')}${profile.education ? `\n\n${escape(profile.education)}` : ''}</div></div></section>
        <section class="card section-card" id="gallery"><div class="section-header"><div><span class="section-index">03 / SELECTED WORK</span><h2>Gallery</h2><p>A few things I’m proud to have put into the world.</p></div>${own ? '<button class="section-action" data-action="add-gallery">Add project ＋</button>' : ''}</div><div class="gallery-grid">${gallery.map((item) => `<article class="gallery-item">${safeUrl(item.image_url) ? `<img src="${escape(safeUrl(item.image_url))}" alt="${escape(item.title)}" loading="lazy">` : ''}<strong>${escape(item.title)}</strong><p>${escape(item.description)}</p>${own ? `<button data-delete-gallery="${escape(item.id)}">Remove</button>` : ''}</article>`).join('')}</div>${gallery.length ? '' : '<p class="empty">No gallery projects yet.</p>'}</section>
      </div><aside class="stack right-column"><section class="card side-card"><div class="section-header"><div><span class="section-index">GOOD PEOPLE, GOOD WORK</span><h3>People to know</h3></div><span class="section-index">✳</span></div>${others.map(person).join('') || '<p class="empty">No other profiles yet.</p>'}<a href="#" class="side-link" data-view="discover">Explore the community <span>↗</span></a></section>
        <section class="card quote-card"><div class="quote-mark">“</div><blockquote>Good work happens when good people find each other.</blockquote><p>A LITTLE REMINDER FROM US TO YOU &nbsp; ✳</p></section>
        <section class="card tips"><div class="tips-row"><span class="tips-icon">✧</span><div><strong>Make yourself at home</strong><p>Your story is more than a job title. Add the things that make you, you.</p></div></div></section>
        ${!own && (profile.contact_email || profile.contact_phone) ? `<section class="card side-card"><div class="section-header"><h3>Get in touch</h3></div>${profile.contact_email ? `<p><a class="inline-link" href="mailto:${encodeURIComponent(profile.contact_email)}">Send an email ↗</a></p>` : ''}${profile.contact_phone ? `<p><a class="inline-link" href="sms:${encodeURIComponent(profile.contact_phone)}">Send a text ↗</a></p>` : ''}</section>` : ''}
      </aside></div>`;
  }
  function discoverView() {
    const query = state.search.toLowerCase().trim();
    const matches = state.profiles.filter((p) => [p.name, p.headline, p.location, p.skills, p.about].some((value) => (value || '').toLowerCase().includes(query)));
    return `${intro('THE COMMUNITY', 'Good people are everywhere.', 'Find interesting people, shared interests, and your next great collaboration.')}<div class="section-header"><div><h2>Discover people</h2><p>${query ? `Results for “${escape(state.search)}”` : 'A few people you might like to know.'}</p></div><span class="section-index">${matches.length} PEOPLE</span></div><div class="directory">${matches.map((p) => `<article class="card directory-card">${avatar(p, 'person-avatar')}<h3>${escape(p.name)}</h3><p>${escape(p.headline || 'People member')}<br>${escape(p.location || '')}</p><button class="button" data-profile="${escape(p.id)}">View profile ↗</button></article>`).join('')}</div>${matches.length ? '' : '<div class="card section-card"><p class="empty">No profiles found. Try another name, role, or skill.</p></div>'}`;
  }
  function communitiesView() {
    const community = state.communities.find((item) => item.id === state.communityId);
    if (!community) {
      return `${intro('FIND YOUR PEOPLE', 'Better together.', 'Discover communities built around shared work, ideas, and interests.')}
        <div class="section-header"><div><h2>Explore communities</h2><p>Find your place or start something new.</p></div><button class="button primary" data-action="create-community">Create community ＋</button></div>
        <div class="directory">${state.communities.map((item) => `<article class="card directory-card community-card"><span class="community-mark">✳</span><h3>${escape(item.name)}</h3><p>${escape(item.description || 'A community for people to connect.')}</p><button class="button" data-community="${escape(item.id)}">Explore community ↗</button></article>`).join('')}</div>
        ${state.communities.length ? '' : '<div class="card section-card"><p class="empty">No communities yet. Start the first one.</p></div>'}`;
    }
    const joined = state.communityMembers.some((member) => member.user_id === state.user?.id);
    const members = state.communityMembers.map((member) => state.profiles.find((profile) => profile.id === member.user_id)).filter(Boolean);
    return `${intro('A PLACE TO CONNECT', escape(community.name), escape(community.description || 'A community for people to connect.'))}
      <div class="community-toolbar"><button class="section-action" data-view="communities">← All communities</button><button class="button ${joined ? '' : 'primary'}" data-action="${joined ? 'leave-community' : 'join-community'}">${joined ? 'Leave community' : 'Join community'}</button></div>
      <div class="layout"><div class="stack"><section class="card section-card"><div class="section-header"><div><span class="section-index">THE CONVERSATION</span><h2>Community posts</h2><p>Posts are visible to everyone.</p></div></div>
        ${joined ? '<form id="community-post-form" class="community-compose"><label class="sr-only" for="community-post-body">Write a community post</label><textarea id="community-post-body" name="body" maxlength="4000" required placeholder="Share something with the community..."></textarea><button class="button primary" type="submit">Share post ↗</button></form>' : '<p class="empty">Join this community to share a post.</p>'}
        <div class="community-feed">${state.communityPosts.map((post) => { const author = state.profiles.find((profile) => profile.id === post.author_id); return `<article class="community-post"><div class="community-post-header">${author ? avatar(author, 'person-avatar') : '<span class="person-avatar">?</span>'}<div class="person-info"><strong>${escape(author?.name || 'Former member')}</strong><span>${escape(new Date(post.created_at).toLocaleDateString())}</span></div>${author ? `<button class="section-action" data-profile="${escape(author.id)}">View profile ↗</button>` : ''}</div><p>${escape(post.body)}</p>${post.author_id === state.user?.id ? `<button class="section-action" data-delete-post="${escape(post.id)}">Remove post</button>` : ''}</article>`; }).join('') || '<p class="empty">No posts yet. Start the conversation.</p>'}</div>
      </section></div><aside class="card side-card"><div class="section-header"><div><span class="section-index">THE PEOPLE</span><h3>Members</h3><p>${state.communityMembers.length} ${state.communityMembers.length === 1 ? 'member' : 'members'}</p></div></div>${members.map(person).join('') || '<p class="empty">No members yet.</p>'}</aside></div>`;
  }
  function messagesView() {
    if (!state.user) return `${intro('YOUR CONVERSATIONS', 'Better conversations start here.', 'Make a connection and take it from there.')}<div class="card section-card"><p class="empty">Sign in to send and read private in-app messages.</p><button class="button primary" data-action="signin">Sign in or join</button></div>`;
    if (!state.own) return `${intro('YOUR CONVERSATIONS', 'Better conversations start here.', 'Make a connection and take it from there.')}<div class="card section-card"><p class="empty">Create a profile before starting a conversation.</p><button class="button primary" data-action="edit">Create profile</button></div>`;
    const ids = [...new Set(state.messages.map((m) => m.sender_id === state.user.id ? m.recipient_id : m.sender_id))];
    if (state.thread && !ids.includes(state.thread)) ids.unshift(state.thread);
    const partner = state.profiles.find((p) => p.id === state.thread);
    const thread = state.messages.filter((m) => m.sender_id === state.thread || m.recipient_id === state.thread);
    return `${intro('YOUR CONVERSATIONS', 'Better conversations start here.', 'Make a connection and take it from there.')}<section class="card inbox"><div class="inbox-list"><h2>Messages</h2>${ids.map((id) => { const p = state.profiles.find((profile) => profile.id === id); return p ? `<button class="conversation ${state.thread === id ? 'active' : ''}" data-thread="${escape(id)}"><strong>${escape(p.name)}</strong><span>${escape(p.headline || 'People member')}</span></button>` : ''; }).join('') || '<p class="empty">No conversations yet. Discover someone and say hello.</p>'}<button class="section-action" data-view="discover">Discover people ↗</button></div><div class="thread">${partner ? `<h2>${escape(partner.name)}</h2><div class="messages">${thread.map((m) => `<div class="bubble ${m.sender_id === state.user.id ? 'mine' : ''}">${escape(m.body)}<time>${escape(new Date(m.created_at).toLocaleString())}</time></div>`).join('') || '<p class="empty">Start the conversation with a friendly hello.</p>'}</div><form class="message-form" id="message-form"><label class="sr-only" for="message-body">Message</label><input id="message-body" name="body" placeholder="Write a message..." maxlength="4000" required><button class="button primary" type="submit">Send ↗</button></form>` : '<p class="empty">Choose a conversation or discover someone new.</p>'}</div></section>`;
  }
  function render() {
    $('#header-title').textContent = state.view === 'profile' ? (isOwn(currentProfile()) || !state.selected ? 'My profile' : 'Profile') : state.view === 'discover' ? 'Discover people' : state.view === 'communities' ? 'Communities' : 'Messages';
    document.querySelectorAll('.nav-link[data-view]').forEach((el) => el.classList.toggle('active', el.dataset.view === state.view));
    $('#account-button').textContent = state.user ? 'Sign out ↗' : 'Sign in ↗';
    content.innerHTML = state.view === 'profile' ? profileView() : state.view === 'discover' ? discoverView() : state.view === 'communities' ? communitiesView() : messagesView();
  }
  async function loadProfiles() {
    if (!client) return;
    const profiles = [];
    const pageSize = 500;
    for (let offset = 0; ; offset += pageSize) {
      const page = check(await client.from('people_profiles').select('*').order('created_at', { ascending: false }).order('id').range(offset, offset + pageSize - 1));
      profiles.push(...page);
      if (page.length < pageSize) break;
    }
    state.profiles = profiles;
    state.own = state.profiles.find((p) => p.id === state.user?.id) || null;
    if (state.user && !state.own) state.own = check(await client.from('people_profiles').select('*').eq('id', state.user.id).maybeSingle());
  }
  async function loadGallery() {
    const profile = currentProfile();
    state.gallery = client && profile ? check(await client.from('people_gallery').select('*').eq('owner_id', profile.id).order('created_at', { ascending: false })) : [];
  }
  async function loadMessages() {
    state.messages = client && state.user ? check(await client.from('people_messages').select('*').order('created_at', { ascending: false }).limit(1000)).reverse() : [];
  }
  async function loadCommunities() {
    if (!configured) { state.communities = sampleCommunities; return; }
    if (!client) throw new Error('The Supabase library could not be loaded. Check your connection and reload.');
    const items = [];
    for (let offset = 0; ; offset += 500) {
      const page = check(await client.from('people_communities').select('*').order('created_at', { ascending: false }).order('id').range(offset, offset + 499));
      items.push(...page);
      if (page.length < 500) break;
    }
    state.communities = items;
  }
  async function loadCommunity(id) {
    state.communityId = id;
    if (!configured) {
      state.communityMembers = sampleMembers.filter((member) => member.community_id === id);
      state.communityPosts = samplePosts.filter((post) => post.community_id === id);
      return;
    }
    async function pages(table, order, ascending) {
      const items = [];
      for (let offset = 0; ; offset += 500) {
        const page = check(await client.from(table).select('*').eq('community_id', id).order(order, { ascending }).order(table === 'people_community_members' ? 'user_id' : 'id').range(offset, offset + 499));
        items.push(...page);
        if (page.length < 500) return items;
      }
    }
    [state.communityMembers, state.communityPosts] = await Promise.all([
      pages('people_community_members', 'joined_at', true),
      pages('people_community_posts', 'created_at', false)
    ]);
  }
  async function navigate(view, selected = null) {
    notice('');
    state.view = view;
    if (view === 'profile') { state.selected = selected; await loadGallery(); }
    if (view === 'messages') await loadMessages();
    if (view === 'communities') { await loadProfiles(); await loadCommunities(); state.communityId = selected; if (selected) await loadCommunity(selected); }
    render();
    if (view === 'messages') document.querySelector('.messages')?.scrollTo(0, 1000000);
  }
  async function initialize() {
    $('#year').textContent = new Date().getFullYear();
    if (client) {
      state.user = check(await client.auth.getSession()).session?.user ?? null;
      await loadProfiles();
      await loadGallery();
    } else if (configured) notice('The Supabase library could not be loaded. Check your connection and reload.', true);
    else $('#preview-notice').hidden = false;
    render();
  }
  document.addEventListener('click', async (event) => {
    const target = event.target.closest('button, a[data-view]');
    if (!target) return;
    try {
      if (target.dataset.view) { event.preventDefault(); await navigate(target.dataset.view); }
      else if (target.dataset.section) { await navigate('profile'); document.getElementById(target.dataset.section)?.scrollIntoView({ behavior: 'smooth' }); }
      else if (target.dataset.profile) { await navigate('profile', target.dataset.profile); window.scrollTo({ top: 0, behavior: 'smooth' }); }
      else if (target.dataset.community) { await navigate('communities', target.dataset.community); window.scrollTo({ top: 0, behavior: 'smooth' }); }
      else if (target.dataset.thread) { state.thread = target.dataset.thread; render(); document.querySelector('.messages')?.scrollTo(0, 1000000); }
      else if (target.dataset.authSwitch) authDialog(target.dataset.authSwitch);
      else if (target.dataset.action === 'signin') authDialog();
      else if (target.dataset.action === 'edit') { if (state.user) profileForm(state.own || { name: state.user.user_metadata?.name || '' }); else authDialog(); }
      else if (target.dataset.action === 'add-gallery') galleryForm();
      else if (target.dataset.action === 'create-community') { if (requireProfile()) communityForm(); }
      else if (target.dataset.action === 'join-community') {
        if (requireProfile()) {
          check(await client.from('people_community_members').insert({ community_id: state.communityId, user_id: state.user.id }));
          await loadCommunity(state.communityId); render(); notice('You joined the community.');
        }
      } else if (target.dataset.action === 'leave-community' && window.confirm('Leave this community?')) {
        check(await client.from('people_community_members').delete().eq('community_id', state.communityId).eq('user_id', state.user.id));
        await loadCommunity(state.communityId); render(); notice('You left the community.');
      } else if (target.dataset.deletePost && window.confirm('Remove this post?')) {
        check(await client.from('people_community_posts').delete().eq('id', target.dataset.deletePost).eq('author_id', state.user.id));
        await loadCommunity(state.communityId); render(); notice('Post removed.');
      }
      else if (target.dataset.action === 'message') {
        if (!state.user) authDialog();
        else if (!state.own) profileForm({ name: state.user.user_metadata?.name || '' });
        else { state.thread = target.dataset.id; await navigate('messages'); }
      } else if (target.dataset.deleteGallery && window.confirm('Remove this gallery project?')) {
        check(await client.from('people_gallery').delete().eq('id', target.dataset.deleteGallery).eq('owner_id', state.user.id));
        await loadGallery(); render(); notice('Project removed.');
      } else if (target.id === 'close-dialog') dialog.close();
      else if (target.id === 'account-button') {
        if (!state.user) authDialog();
        else { check(await client.auth.signOut()); state.user = null; state.own = null; state.thread = null; await loadProfiles(); await navigate('profile'); notice('You are signed out.'); }
      }
    } catch (error) { showError(error); }
  });
  document.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.target;
    const values = Object.fromEntries(new FormData(form));
    const errorBox = form.querySelector('.dialog-error');
    const submit = form.querySelector('[type="submit"]');
    if (submit) submit.disabled = true;
    try {
      if (form.id === 'search-form') { state.search = values.search || $('#search-input').value; await navigate('discover'); }
      else if (form.id === 'auth-form') {
        if (values.name !== undefined) {
          const result = check(await client.auth.signUp({ email: values.email, password: values.password, options: { data: { name: values.name.trim() } } }));
          if (!result.session) { dialog.close(); notice('Account created. Check your email to confirm your account, then sign in.'); return; }
          state.user = result.user;
        } else state.user = check(await client.auth.signInWithPassword({ email: values.email, password: values.password })).user;
        await loadProfiles(); dialog.close(); await navigate('profile');
        if (!state.own) profileForm({ name: state.user.user_metadata?.name || '' });
      } else if (form.id === 'profile-form') {
        values.name = values.name.trim();
        if (!values.name) throw new Error('Please enter your name.');
        for (const key of ['avatar_url', 'cv_url']) if (values[key] && !safeUrl(values[key])) throw new Error('Photo and CV links must use HTTP or HTTPS.');
        check(await client.from('people_profiles').upsert({ ...values, id: state.user.id }));
        await loadProfiles(); dialog.close(); await navigate('profile'); notice('Your profile has been saved.');
      } else if (form.id === 'gallery-form') {
        if (!safeUrl(values.image_url)) throw new Error('The image link must use HTTP or HTTPS.');
        values.title = values.title.trim();
        if (!values.title) throw new Error('Please enter a project title.');
        check(await client.from('people_gallery').insert({ ...values, owner_id: state.user.id }));
        dialog.close(); await loadGallery(); render(); notice('Project added to your gallery.');
      } else if (form.id === 'community-form') {
        const name = values.name.trim();
        if (!name) throw new Error('Please enter a community name.');
        const community = check(await client.from('people_communities').insert({ name, description: values.description.trim(), creator_id: state.user.id }).select().single());
        dialog.close(); await navigate('communities', community.id); notice('Your community is ready.');
      } else if (form.id === 'community-post-form') {
        const body = values.body.trim();
        if (!body) throw new Error('Please write a post.');
        check(await client.from('people_community_posts').insert({ community_id: state.communityId, author_id: state.user.id, body }));
        await loadCommunity(state.communityId); render(); notice('Your post has been shared.');
      } else if (form.id === 'message-form') {
        const body = values.body.trim();
        if (!body) throw new Error('Please enter a message.');
        check(await client.from('people_messages').insert({ sender_id: state.user.id, recipient_id: state.thread, body }));
        await loadMessages(); render(); document.querySelector('.messages')?.scrollTo(0, 1000000);
      }
    } catch (error) { if (errorBox) errorBox.textContent = error.message || String(error); else showError(error); }
    finally { if (submit) submit.disabled = false; }
  });
  document.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); $('#search-input').focus(); }
  });
  initialize().catch(showError);
})();
