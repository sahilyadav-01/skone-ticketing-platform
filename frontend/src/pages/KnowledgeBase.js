import React, { useState, useMemo } from 'react';

const KB_ARTICLES = [
  {
    id: 'KB-1001',
    category: 'Accounts & Auth',
    title: 'How to Reset Your Active Directory Password',
    summary: 'Step-by-step guide to resetting your core domain credentials and updating cached credentials on company hardware.',
    content: `If you are locked out of your Skone IT systems or need to renew your Active Directory password, please follow these instructions:
    
1. Open a secure browser and navigate to the **Skone Account Self-Service Portal**.
2. Enter your employee email address and complete the Multi-Factor Authentication (MFA) challenge.
3. Choose a new password complying with security regulations:
   - Minimum 14 characters
   - Must include uppercase, lowercase, numbers, and symbols
   - Cannot match your previous 5 passwords
4. After updating, lock your laptop (Win + L) and unlock it using the new password while connected to the company network (or VPN) to sync cached credentials locally.`,
    tags: ['password', 'ad', 'domain', 'lockout', 'credentials']
  },
  {
    id: 'KB-1002',
    category: 'Networking & VPN',
    title: 'Connecting to Corporate VPN via FortiClient',
    summary: 'Troubleshoot and establish a secure remote connection to the corporate network from home or client locations.',
    content: `To access internal company servers, databases, and portals remotely, you must connect via the FortiClient SSL VPN:

1. Launch the **FortiClient** app on your laptop. If not installed, request it via an IT lease ticket.
2. Ensure the connection parameters match these credentials:
   - **VPN Name**: Skone Remote Gateway
   - **Remote Gateway**: \`vpn.skone-tech.com:10443\`
   - **Client Certificate**: [Select your corporate AD certificate]
3. Enter your username (AD) and password, then click **Connect**.
4. Check your phone for the **Microsoft Authenticator** push notification and approve the prompt.
5. If you encounter error 'Tunnel Connection Failed', try restarting the 'FortiClient VPN Service' in your local Services settings.`,
    tags: ['vpn', 'remote', 'network', 'forticlient', 'tunnel']
  },
  {
    id: 'KB-1003',
    category: 'Hardware Leases',
    title: 'Requesting Laptop Hardware Upgrades or Replacements',
    summary: 'Policy and process guidelines for upgrading local work hardware or reporting damaged lease equipment.',
    content: `Skone employees are eligible for hardware refreshes every 3 years. If you need an early replacement or upgrade due to technical performance or damage:

1. Run a local diagnostic report on your device (e.g. Activity Monitor / Task Manager) to document memory or disk bottlenecks.
2. In the Skone ITSM dashboard, go to **Assets** and copy your laptop's **Asset Tag** (e.g. \`SKN-HW-8201\`).
3. Click **Create Ticket** and select **Hardware Upgrade** as the category.
4. Attach your Asset Tag and describe the performance degradation or damage details.
5. Once your manager approves the purchase requisition, the IT inventory administrator will contact you to schedule an migration/swap date.`,
    tags: ['laptop', 'hardware', 'upgrade', 'asset', 'lease']
  },
  {
    id: 'KB-1004',
    category: 'Software Access',
    title: 'Accessing the Adobe Creative Cloud Suite License',
    summary: 'Guidelines to claim and authorize a Creative Cloud corporate subscription seat under Skone licensing.',
    content: `We offer corporate Adobe Creative Cloud licenses to members of product, marketing, and design teams:

1. Send an access request email to your manager for resource authorization.
2. Once authorized, go to \`creativecloud.adobe.com\` and enter your corporate email address.
3. When prompted, select **Company or School Account** (do NOT select Personal Account).
4. You will be redirected to the Skone Single Sign-On (SSO) gateway. Complete your sign-in details.
5. Download the Adobe Creative Cloud Desktop application to install Photoshop, Illustrator, Premiere Pro, or other tools.
6. The license check runs automatically in the background; you do not need to enter license keys manually.`,
    tags: ['adobe', 'license', 'software', 'creative cloud', 'sso']
  },
  {
    id: 'KB-1005',
    category: 'Hardware Leases',
    title: 'Troubleshooting Office Printer & Scanner Connectivity',
    summary: 'Quick guide to map local office network printers and solve queue freeze states on Windows & macOS.',
    content: `If you are in a Skone office and unable to print or send documents to office network printers:

1. Confirm your device is connected to the primary **Skone-Corporate** Wi-Fi network (not the Guest network).
2. For **Windows**:
   - Open Settings > Devices > Printers & Scanners.
   - Click **Add a printer or scanner** and select the name matching your floor (e.g. \`SKN-PRN-FL3-COL\`).
3. For **macOS**:
   - Open System Settings > Printers & Scanners.
   - The printer should auto-configure via Bonjour. If not, click Add, choose IP, enter \`printer-fl3.skone-it.local\`, and select AirPrint.
4. If print jobs freeze in queue, clear the queue by restarting your local print spooler service.`,
    tags: ['printer', 'scanner', 'network', 'hardware', 'office']
  },
  {
    id: 'KB-1006',
    category: 'Accounts & Auth',
    title: 'Setting Up Multi-Factor Authentication (MFA)',
    summary: 'Enroll and configure your secondary verification device to satisfy corporate security standards.',
    content: `All corporate employee credentials must be secured using Multi-Factor Authentication (MFA) to prevent unauthorized resource overrides:

1. Install the **Microsoft Authenticator** app from your smartphone's App Store or Google Play Store.
2. On your work laptop, navigate to \`myaccount.microsoft.com\` and sign in with your Skone IT credentials.
3. Select **Security Info** in the left navigation sidebar and click **Add Method**.
4. Select **Authenticator App** and click Add.
5. Scan the QR code displayed on your laptop screen using the Microsoft Authenticator app on your phone.
6. Approve the test verification prompt on your smartphone to complete registration.`,
    tags: ['mfa', 'security', 'authenticator', 'accounts', 'auth']
  }
];

const CATEGORIES = ['All', 'Accounts & Auth', 'Networking & VPN', 'Hardware Leases', 'Software Access'];

function KnowledgeBase() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [expandedId, setExpandedId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const toggleAccordion = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleCopyLink = (e, article) => {
    e.stopPropagation();
    const referenceText = `[KB Article: ${article.title}] (#KB-${article.id})`;
    navigator.clipboard.writeText(referenceText)
      .then(() => {
        setCopiedId(article.id);
        setTimeout(() => setCopiedId(null), 2000);
      })
      .catch((err) => {
        console.error('Failed to copy text: ', err);
      });
  };

  // Filter articles based on category pill and search query
  const filteredArticles = useMemo(() => {
    return KB_ARTICLES.filter((article) => {
      const categoryMatch = selectedCategory === 'All' || article.category === selectedCategory;
      
      const query = searchQuery.trim().toLowerCase();
      if (!query) return categoryMatch;

      const titleMatch = article.title.toLowerCase().includes(query);
      const summaryMatch = article.summary.toLowerCase().includes(query);
      const contentMatch = article.content.toLowerCase().includes(query);
      const tagsMatch = article.tags.some(tag => tag.toLowerCase().includes(query));

      return categoryMatch && (titleMatch || summaryMatch || contentMatch || tagsMatch);
    });
  }, [selectedCategory, searchQuery]);

  return (
    <div className="section-panel" style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <div className="section-header">
        <div>
          <h2>Knowledge Base</h2>
          <p className="section-subtitle">Find immediate self-service solutions and reduce repeat service desk tickets.</p>
        </div>
      </div>

      {/* 1. Filter Controls & Search bar */}
      <div className="toolbar" style={{ margin: '20px 0 24px 0', gap: 16 }}>
        <div className="search-wrapper" style={{ flex: '1', minWidth: '280px', position: 'relative' }}>
          <svg 
            className="search-wrapper__icon" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 18, height: 18, color: 'var(--muted)', pointerEvents: 'none' }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="control"
            placeholder="Search documentation, tags, or troubleshooting keywords..."
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: 44, height: 46 }}
          />
        </div>

        {/* Category Filter Pills */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              className={`btn ${selectedCategory === category ? 'btnPrimary' : 'btnMuted'}`}
              onClick={() => setSelectedCategory(category)}
              style={{ fontSize: 13, padding: '10px 16px', height: 46 }}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Knowledge Articles Accordion Stack */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {filteredArticles.length === 0 ? (
          <div className="ticket-card" style={{ padding: '40px', textAlignment: 'center', background: 'var(--panel)' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>🔍</div>
              <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>No Articles Found</div>
              <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>
                We couldn't find any articles matching "{searchQuery}" under "{selectedCategory}". Try adjusting your keywords.
              </p>
            </div>
          </div>
        ) : (
          filteredArticles.map((article) => {
            const isExpanded = expandedId === article.id;
            return (
              <div 
                key={article.id} 
                className={`ticket-card`}
                style={{ 
                  cursor: 'pointer',
                  padding: 20, 
                  background: isExpanded ? 'var(--panel-solid)' : 'var(--panel)',
                  borderColor: isExpanded ? 'rgba(37, 99, 235, 0.35)' : 'var(--border)',
                  boxShadow: isExpanded ? 'var(--shadow-lg), var(--shadow-glow)' : 'var(--shadow)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                onClick={() => toggleAccordion(article.id)}
              >
                {/* Article Card Title Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ 
                        fontSize: 10, 
                        fontWeight: 700, 
                        background: 'rgba(37, 99, 235, 0.08)', 
                        color: 'var(--blue)', 
                        padding: '3px 8px', 
                        borderRadius: 6,
                        textTransform: 'uppercase',
                        letterSpacing: '0.02em'
                      }}>
                        {article.category}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)' }}>
                        {article.id}
                      </span>
                    </div>
                    <h3 style={{ margin: '4px 0 0 0', fontSize: '1.05rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.01em' }}>
                      {article.title}
                    </h3>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                    <button
                      type="button"
                      className="btn"
                      onClick={(e) => handleCopyLink(e, article)}
                      style={{ 
                        padding: '6px 12px', 
                        fontSize: 11.5, 
                        borderRadius: 'var(--radius-sm)', 
                        height: 30,
                        background: copiedId === article.id ? 'var(--success)' : 'rgba(255,255,255,0.6)',
                        color: copiedId === article.id ? '#fff' : 'var(--text-light)',
                        border: '1px solid var(--border)'
                      }}
                      title="Copy markdown reference link to clipboard"
                    >
                      {copiedId === article.id ? '✓ Copied' : '🔗 Copy Ref'}
                    </button>
                    
                    {/* Expand/Collapse Chevron Icon */}
                    <div style={{
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.25s ease',
                      color: 'var(--muted)',
                      width: 20,
                      height: 20,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Summary View (visible when collapsed) */}
                {!isExpanded && (
                  <p style={{ margin: '8px 0 0 0', fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
                    {article.summary}
                  </p>
                )}

                {/* Content View (visible when expanded) */}
                {isExpanded && (
                  <div 
                    style={{ 
                      marginTop: 16, 
                      paddingTop: 16, 
                      borderTop: '1px solid var(--border-dark)',
                      animation: 'fadeIn 0.25s ease-out'
                    }}
                    onClick={(e) => e.stopPropagation()} // Prevent collapse when clicking contents
                  >
                    <div style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>
                      {article.content}
                    </div>

                    {/* Meta Tags Row */}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 16 }}>
                      {article.tags.map((tag) => (
                        <span 
                          key={tag} 
                          style={{ 
                            fontSize: 11, 
                            fontWeight: 500, 
                            background: 'rgba(15, 23, 42, 0.04)', 
                            color: 'var(--muted)', 
                            padding: '3px 8px', 
                            borderRadius: 6 
                          }}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default KnowledgeBase;
