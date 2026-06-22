export function generateSuggestedReply(ticket, currentUser, isSupport) {
  if (!ticket) return '';
  const ticketId = ticket.ticket_id;
  const subject = ticket.subject || ticket.issue_type || 'Support Ticket';
  const status = ticket.status || 'Open';
  const priority = ticket.priority || 'Low';
  const clientName = ticket.client?.username || 'Client';
  const techName = ticket.assigned_tech || 'Support Technician';
  const userName = currentUser?.username || 'User';

  if (isSupport) {
    // Tech to User template replies based on status
    if (status === 'Open' || status === 'Assigned') {
      return `Subject: Re: TK-${ticketId} - ${subject}

Hi ${clientName},

Thank you for reporting this issue. I am currently reviewing the details of your ticket regarding the ${subject}. 

To assist with troubleshooting, could you please confirm:
- When did this issue first start occurring?
- Are you receiving any specific error codes or screenshots?

I have set this ticket to "In Progress" and will keep you updated as I run further diagnostics.

Best regards,

${userName}
IT Support Team`;
    } else if (status === 'In Progress') {
      return `Subject: Re: TK-${ticketId} - ${subject}

Hi ${clientName},

Just a quick update regarding your ticket TK-${ticketId}. I am actively working on diagnosing the root cause of the ${ticket.issue_type || subject} issue. 

I've checked our internal logs and am currently checking configuration parameters. 

I will reach out as soon as I have a concrete workaround or resolution. Let me know if you have any additional details to share in the meantime.

Best regards,

${userName}
IT Support Team`;
    } else if (status === 'Resolved') {
      return `Subject: Re: TK-${ticketId} - ${subject}

Hi ${clientName},

I am pleased to inform you that we have resolved the issue regarding your ${subject}. 

Could you please verify on your end if the service is working normally now? Once you confirm, we will mark this ticket as closed.

Thank you for your patience.

Best regards,

${userName}
IT Support Team`;
    } else {
      return `Subject: Re: TK-${ticketId} - ${subject}

Hi ${clientName},

Reaching out regarding ticket TK-${ticketId} (Priority: ${priority}, Status: ${status}). 

Please let me know if you need any further assistance with this issue.

Best regards,

${userName}
IT Support Team`;
    }
  } else {
    // Client to Tech template replies based on status
    if (status === 'Open') {
      return `Subject: Re: TK-${ticketId} - ${subject}

Hi Support Team,

I wanted to follow up on this ticket. The issue with my ${subject} is still occurring and is impacting my work. 

Please let me know if you have assigned a technician to this ticket or if you need any additional diagnostic info from my side.

Thanks,

${userName}`;
    } else if (status === 'Assigned' || status === 'In Progress') {
      return `Subject: Re: TK-${ticketId} - ${subject}

Hi ${techName},

Reaching out to check if there are any updates on ticket TK-${ticketId} regarding the ${subject}. 

Please let me know if there are any logs I should collect or tests I should run on my leased hardware.

Thanks,

${userName}`;
    } else if (status === 'Resolved') {
      return `Subject: Re: TK-${ticketId} - ${subject}

Hi ${techName},

Thank you for resolving this. I have verified on my end, and everything seems to be working perfectly now. 

You can proceed with closing this ticket.

Thanks,

${userName}`;
    } else {
      return `Subject: Re: TK-${ticketId} - ${subject}

Hi Support Team,

Reaching out regarding my ticket TK-${ticketId}. 

[Add your message details here...]

Thanks,

${userName}`;
    }
  }
}

export async function generateAISuggestedReply(ticket, currentUser, isSupport, commentHistory = []) {
  const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
  
  if (!apiKey) {
    console.warn('REACT_APP_GEMINI_API_KEY environment variable is not defined. Falling back to template-based replies.');
    return generateSuggestedReply(ticket, currentUser, isSupport);
  }

  if (!ticket) return '';

  const ticketId = ticket.ticket_id;
  const subject = ticket.subject || ticket.issue_type || 'Support Ticket';
  const status = ticket.status || 'Open';
  const priority = ticket.priority || 'Low';
  const clientName = ticket.client?.username || 'Client';
  const techName = ticket.assigned_tech || 'Support Technician';
  const userName = currentUser?.username || 'User';

  const roleContext = isSupport 
    ? `You are an IT Support Technician named ${userName} at Skone IT. Draft a polite, professional reply to the client, ${clientName}, regarding their ticket (TK-${ticketId}).`
    : `You are a Client named ${userName} at Skone IT. Draft a polite reply to the support team or technician (${techName}) regarding your ticket (TK-${ticketId}).`;

  const metadataContext = `
Ticket Details:
- Subject: ${subject}
- Issue Type: ${ticket.issue_type || 'General'}
- Status: ${status}
- Priority: ${priority}
- Error Code: ${ticket.error_code || 'None'}
- Original Description: ${ticket.description || 'No description provided.'}
`;

  const conversationContext = commentHistory && commentHistory.length > 0
    ? `
Recent Conversation History (from oldest to newest):
${commentHistory.slice(-6).map(c => `[${c.user?.username || 'User'} (${c.user?.role || 'Role'})]: ${c.message}`).join('\n')}
`
    : '';

  const prompt = `
${roleContext}

${metadataContext}
${conversationContext}

Instructions:
1. Write a direct email-like reply addressing the issue description and recent comments. Do not ask details that were already mentioned.
2. Keep the reply clean, helpful, concise, and structured.
3. Output ONLY the response body. Do not include markdown code block formatting (such as \`\`\` or similar), metadata prefixes, subject lines, or generic brackets. Start directly with the greeting ("Hi ${isSupport ? clientName : (techName || 'Support Team')},") and end with a sign-off ("Best regards," or "Thanks," followed by "${userName}").
`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API responded with status ${response.status}`);
    }

    const data = await response.json();
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (replyText && replyText.trim()) {
      return replyText.trim();
    }
    
    throw new Error('Empty response from Gemini API');
  } catch (error) {
    console.error('Failed to generate AI reply:', error);
    return generateSuggestedReply(ticket, currentUser, isSupport);
  }
}

