"""
Django management command to seed the database with realistic test data.

This command creates:
- Organizations with owners
- Organizers (collaborators) who create events in multiple organizations
- Students with interests and participations
- Events (past and future, with various categories and capacities)
- Relationships (followers, interests, participations)
- Sample notifications
"""

import random
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from faker import Faker

from accounts.models import Organization, Profile
from events.models import Event
from notifications.models import Notification

User = get_user_model()
fake = Faker(["en_US", "pt_PT", "es_ES", "fr_FR", "de_DE", "it_IT"])

# Porto-specific locations
PORTO_LOCATIONS = [
    "Ribeira Square",
    "Casa da Música",
    "Livraria Lello",
    "Clérigos Tower",
    "São Bento Station",
    "Crystal Palace Gardens",
    "Serralves Museum",
    "Porto Cathedral",
    "Foz do Douro",
    "Matosinhos Beach",
    "Vila Nova de Gaia",
    "Rua de Santa Catarina",
    "Bolhão Market",
    "Porto City Park",
    "University of Porto",
    "Porto Business School",
    "FEUP Campus",
    "ICBAS Campus",
]

# Event name templates by category
EVENT_TEMPLATES = {
    "SOCIAL": [
        "Welcome Party for New Students",
        "International Mixer",
        "Language Exchange Meetup",
        "Coffee & Conversation",
        "Friendship Speed Dating",
        "Cultural Exchange Evening",
        "Game Night",
        "Karaoke Night",
    ],
    "ACADEMIC": [
        "Study Group Session",
        "Academic Workshop",
        "Career Fair",
        "Research Presentation",
        "Thesis Defense Support",
        "Library Study Marathon",
        "Academic Writing Workshop",
        "Exam Preparation Session",
    ],
    "TRAVEL": [
        "Weekend Trip to Lisbon",
        "Douro Valley Wine Tour",
        "Coimbra Day Trip",
        "Guimarães Historical Tour",
        "Beach Day at Matosinhos",
        "Porto Walking Tour",
        "Sintra Day Excursion",
        "Braga City Tour",
    ],
    "SPORTS": [
        "Football Match",
        "Beach Volleyball",
        "Running Group",
        "Yoga in the Park",
        "Basketball Tournament",
        "Cycling Tour",
        "Swimming Session",
        "Hiking Adventure",
    ],
    "CULTURAL": [
        "Museum Visit",
        "Concert at Casa da Música",
        "Theater Performance",
        "Art Gallery Opening",
        "Portuguese Fado Night",
        "Film Screening",
        "Photography Walk",
        "Traditional Dance Class",
    ],
    "VOLUNTEERING": [
        "Beach Cleanup",
        "Food Bank Volunteer",
        "Community Garden Project",
        "Animal Shelter Help",
        "Elderly Care Visit",
        "Environmental Awareness Event",
        "Charity Fundraiser",
        "School Tutoring",
    ],
    "NIGHTLIFE": [
        "Bar Crawl",
        "Club Night",
        "Live Music Night",
        "Pub Quiz",
        "Dance Party",
        "Rooftop Drinks",
        "Wine Tasting",
        "Cocktail Making Class",
    ],
}

# Organization name templates
ORG_TEMPLATES = [
    "Erasmus Student Network {city}",
    "{city} International Students Association",
    "{city} Exchange Student Club",
    "International Community {city}",
    "{city} Student Union",
    "Global Students {city}",
    "{city} Cultural Exchange",
    "Erasmus in {city}",
    "{city} Welcome Committee",
    "International Friends {city}",
    "{city} Language Exchange",
    "{city} Social Club",
    "Study Abroad {city}",
    "{city} International Hub",
    "Global Connections {city}",
]


class Command(BaseCommand):
    help = "Seed database with organizations, organizers, students, and events"

    def add_arguments(self, parser):
        parser.add_argument(
            "--orgs",
            type=int,
            default=40,
            help="Number of organizations to create (default: 40)",
        )
        parser.add_argument(
            "--organizers",
            type=int,
            default=12,
            help="Number of organizer collaborators to create (default: 12)",
        )
        parser.add_argument(
            "--students",
            type=int,
            default=75,
            help="Number of student accounts to create (default: 75)",
        )
        parser.add_argument(
            "--events-per-organizer",
            type=int,
            default=12,
            help="Minimum events per organizer (default: 12)",
        )
        parser.add_argument(
            "--min-interested",
            type=int,
            default=30,
            help="Minimum events each student is interested in (default: 30)",
        )
        parser.add_argument(
            "--min-participating",
            type=int,
            default=10,
            help="Minimum events each student participates in (default: 10)",
        )
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Clear existing data before seeding",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        num_orgs = options["orgs"]
        num_organizers = options["organizers"]
        num_students = options["students"]
        events_per_organizer = options["events_per_organizer"]
        min_interested = options["min_interested"]
        min_participating = options["min_participating"]
        clear = options["clear"]

        if clear:
            self.stdout.write(self.style.WARNING("Clearing existing data..."))
            Notification.objects.all().delete()
            Event.objects.all().delete()
            Organization.objects.all().delete()
            User.objects.filter(is_superuser=False).delete()
            self.stdout.write(self.style.SUCCESS("Existing data cleared."))

        self.stdout.write(self.style.SUCCESS("Starting seed process..."))

        # Step 1: Create organization owners
        self.stdout.write("Creating organization owners...")
        org_owners = self._create_organization_owners(num_orgs)
        self.stdout.write(
            self.style.SUCCESS(f"Created {len(org_owners)} organization owners")
        )

        # Step 2: Create organizations
        self.stdout.write("Creating organizations...")
        organizations = self._create_organizations(org_owners)
        self.stdout.write(
            self.style.SUCCESS(f"Created {len(organizations)} organizations")
        )

        # Step 3: Create organizer collaborators
        self.stdout.write("Creating organizer collaborators...")
        organizers = self._create_organizers(num_organizers)
        self.stdout.write(
            self.style.SUCCESS(f"Created {len(organizers)} organizer collaborators")
        )

        # Step 4: Add organizers as collaborators to organizations
        self.stdout.write("Adding organizers as collaborators...")
        self._add_collaborators(organizers, organizations)
        self.stdout.write(self.style.SUCCESS("Collaborators added"))

        # Step 5: Create events
        self.stdout.write("Creating events...")
        events = self._create_events(organizers, organizations, events_per_organizer)
        self.stdout.write(self.style.SUCCESS(f"Created {len(events)} events"))

        # Step 6: Create students
        self.stdout.write("Creating students...")
        students = self._create_students(num_students)
        self.stdout.write(self.style.SUCCESS(f"Created {len(students)} students"))

        # Step 7: Create relationships
        self.stdout.write("Creating relationships...")
        self._create_relationships(
            students, organizations, events, min_interested, min_participating
        )
        self.stdout.write(self.style.SUCCESS("Relationships created"))

        # Step 8: Create notifications
        self.stdout.write("Creating sample notifications...")
        self._create_notifications(students, events)
        self.stdout.write(self.style.SUCCESS("Notifications created"))

        self.stdout.write(
            self.style.SUCCESS("\n✅ Seed process completed successfully!")
        )
        self.stdout.write(f"   - Organizations: {len(organizations)}")
        self.stdout.write(f"   - Organizers: {len(organizers)}")
        self.stdout.write(f"   - Students: {len(students)}")
        self.stdout.write(f"   - Events: {len(events)}")

    def _create_organization_owners(self, count):
        """Create users who will own organizations."""
        owners = []
        for i in range(count):
            first_name = fake.first_name()
            last_name = fake.last_name()
            username = f"org_owner_{i+1}_{fake.user_name()[:8]}"
            email = f"owner_{i+1}_{fake.email()}"

            # Ensure unique email
            while User.objects.filter(email=email).exists():
                email = f"owner_{i+1}_{fake.email()}"

            user = User.objects.create_user(
                username=username,
                email=email,
                password="password123",
                first_name=first_name,
                last_name=last_name,
            )
            user.profile.role = Profile.Role.ORGANIZER
            user.profile.phone_number = fake.phone_number()[:15]
            user.profile.bio = fake.text(max_nb_chars=200)
            user.profile.save()

            owners.append(user)

        return owners

    def _create_organizations(self, owners):
        """Create organizations with owners. Ensures at least one of each type."""
        organizations = []
        org_types = [choice[0] for choice in Organization.OrganizationType.choices]

        for i, owner in enumerate(owners):
            # For first few organizations, assign one of each type
            if i < len(org_types):
                org_type = org_types[i]
            else:
                # After ensuring all types, cycle through for even distribution
                org_type = org_types[i % len(org_types)]

            # Generate unique organization name
            city = "Porto"
            org_name_template = random.choice(ORG_TEMPLATES)
            org_name = org_name_template.format(city=city)
            base_name = org_name
            counter = 1
            while Organization.objects.filter(name=org_name).exists():
                org_name = f"{base_name} {counter}"
                counter += 1

            # Generate unique email
            org_email = f"contact_{i+1}_{fake.email()}"
            while Organization.objects.filter(email=org_email).exists():
                org_email = f"contact_{i+1}_{fake.email()}"

            org = Organization.objects.create(
                name=org_name,
                owner=owner,
                description=fake.text(max_nb_chars=500),
                organization_type=org_type,
                email=org_email,
                website=f"https://{fake.domain_name()}",
                phone=fake.phone_number()[:20],
                address=fake.address(),
                city="Porto",
                country="Portugal",
                twitter_handle=f"@{fake.user_name()}" if random.random() > 0.5 else "",
                facebook_url=(
                    f"https://facebook.com/{fake.user_name()}"
                    if random.random() > 0.5
                    else ""
                ),
                instagram_handle=(
                    f"@{fake.user_name()}" if random.random() > 0.5 else ""
                ),
                linkedin_url=(
                    f"https://linkedin.com/company/{fake.user_name()}"
                    if random.random() > 0.5
                    else ""
                ),
                established_date=(
                    fake.date_between(start_date="-10y", end_date="-1y")
                    if random.random() > 0.3
                    else None
                ),
            )

            organizations.append(org)

        return organizations

    def _create_organizers(self, count):
        """Create organizer users who will be collaborators."""
        organizers = []
        for i in range(count):
            first_name = fake.first_name()
            last_name = fake.last_name()
            username = f"organizer_{i+1}_{fake.user_name()[:8]}"
            email = f"organizer_{i+1}_{fake.email()}"

            # Ensure unique email
            while User.objects.filter(email=email).exists():
                email = f"organizer_{i+1}_{fake.email()}"

            user = User.objects.create_user(
                username=username,
                email=email,
                password="password123",
                first_name=first_name,
                last_name=last_name,
            )
            user.profile.role = Profile.Role.ORGANIZER
            user.profile.phone_number = fake.phone_number()[:15]
            user.profile.bio = fake.text(max_nb_chars=200)
            user.profile.save()

            organizers.append(user)

        return organizers

    def _add_collaborators(self, organizers, organizations):
        """Add organizers as collaborators to 5+ organizations each."""
        for organizer in organizers:
            # Each organizer collaborates in 5-8 organizations
            num_collaborations = random.randint(5, min(8, len(organizations)))
            selected_orgs = random.sample(organizations, num_collaborations)

            for org in selected_orgs:
                # Don't add as collaborator if they're the owner
                if org.owner != organizer:
                    org.collaborators.add(organizer)

    def _create_events(self, organizers, organizations, events_per_organizer):
        """Create events for organizers in their collaborating organizations.
        Ensures at least one event of each category."""
        events = []
        categories = [choice[0] for choice in Event.CATEGORY_CHOICES]
        now = timezone.now()
        event_counter = 0

        for organizer in organizers:
            # Get organizations where this organizer is a collaborator
            collaborating_orgs = Organization.objects.filter(collaborators=organizer)

            if not collaborating_orgs.exists():
                continue

            # Create events_per_organizer to events_per_organizer + 3 events
            num_events = random.randint(events_per_organizer, events_per_organizer + 3)

            for _ in range(num_events):
                # Select a random organization from collaborations
                org = random.choice(list(collaborating_orgs))

                # 70% future events, 30% past events
                is_future = random.random() > 0.3

                if is_future:
                    # Future: next 6 months
                    event_date = now + timedelta(
                        days=random.randint(1, 180),
                        hours=random.randint(9, 22),
                        minutes=random.choice([0, 30]),
                    )
                    status = "Active"
                else:
                    # Past: last 6 months
                    event_date = now - timedelta(
                        days=random.randint(1, 180),
                        hours=random.randint(9, 22),
                        minutes=random.choice([0, 30]),
                    )
                    # 10% of past events are cancelled
                    status = "Cancelled" if random.random() < 0.1 else "Active"

                # Ensure at least one event of each category,
                # then cycle through for even distribution
                if event_counter < len(categories):
                    # First events: one of each category
                    category = categories[event_counter]
                else:
                    # After ensuring all categories, cycle through for even distribution
                    category = categories[event_counter % len(categories)]

                event_name_template = random.choice(EVENT_TEMPLATES[category])
                date_str = fake.date_time_between(
                    start_date="-1y", end_date="+1y"
                ).strftime("%B %Y")
                event_name = f"{event_name_template} - {date_str}"

                # 50% have capacity, 50% unlimited
                has_capacity = random.random() > 0.5
                capacity = random.randint(20, 200) if has_capacity else None

                event = Event.objects.create(
                    name=event_name[:100],  # Ensure max_length
                    date=event_date,
                    location=random.choice(PORTO_LOCATIONS),
                    description=fake.text(max_nb_chars=300),
                    category=category,
                    organizer=organizer,
                    organization=org,
                    status=status,
                    capacity=capacity,
                )

                events.append(event)
                event_counter += 1

        return events

    def _create_students(self, count):
        """Create student users."""
        students = []
        for i in range(count):
            first_name = fake.first_name()
            last_name = fake.last_name()
            username = f"student_{i+1}_{fake.user_name()[:8]}"
            email = f"student_{i+1}_{fake.email()}"

            # Ensure unique email
            while User.objects.filter(email=email).exists():
                email = f"student_{i+1}_{fake.email()}"

            user = User.objects.create_user(
                username=username,
                email=email,
                password="password123",
                first_name=first_name,
                last_name=last_name,
            )
            user.profile.role = Profile.Role.ATTENDEE
            user.profile.phone_number = fake.phone_number()[:15]
            user.profile.bio = fake.text(max_nb_chars=200)
            user.profile.save()

            students.append(user)

        return students

    def _create_relationships(
        self, students, organizations, events, min_interested, min_participating
    ):
        """Create M2M relationships: followers, interests, participations."""
        if not students or not organizations or not events:
            return

        # Students follow 5-15 organizations each
        for student in students:
            num_follows = random.randint(5, min(15, len(organizations)))
            orgs_to_follow = random.sample(organizations, num_follows)
            for org in orgs_to_follow:
                org.followers.add(student)

        # Students interested in 30+ events (or all events if less than min_interested)
        for student in students:
            max_interested = min(min_interested + 20, len(events))
            num_interested = random.randint(
                min(min_interested, len(events)), max_interested
            )
            if num_interested > 0:
                events_to_interest = random.sample(events, num_interested)
                for event in events_to_interest:
                    event.interested_users.add(student)

        # Students participating in 10+ events (only future/active events)
        future_events = [
            e for e in events if e.date > timezone.now() and e.status == "Active"
        ]
        if future_events:
            for student in students:
                max_participating = min(min_participating + 10, len(future_events))
                num_participating = random.randint(
                    min(min_participating, len(future_events)), max_participating
                )
                if num_participating > 0:
                    events_to_participate = random.sample(
                        future_events, num_participating
                    )

                    for event in events_to_participate:
                        # Check capacity before adding
                        if event.capacity:
                            current_count = event.participants.count()
                            if current_count < event.capacity:
                                event.participants.add(student)
                        else:
                            event.participants.add(student)

        # Some events at capacity (fill them up)
        for event in future_events:
            if (
                event.capacity and random.random() < 0.2
            ):  # 20% of capacity events are full
                current_count = event.participants.count()
                needed = event.capacity - current_count
                if needed > 0:
                    available_students = [
                        s for s in students if s not in event.participants.all()
                    ]
                    if available_students:
                        to_add_count = min(needed, len(available_students))
                        to_add = random.sample(available_students, to_add_count)
                        for student in to_add:
                            event.participants.add(student)

    def _create_notifications(self, students, events):
        """Create sample notifications for students."""
        notification_titles = [
            "New Event Created",
            "Event Updated",
            "Event Reminder",
            "You have a new follower",
            "Event capacity reached",
            "Event cancelled",
        ]

        for student in students[:20]:  # Create notifications for first 20 students
            num_notifications = random.randint(3, 10)
            for _ in range(num_notifications):
                title = random.choice(notification_titles)
                if "Event" in title:
                    event = random.choice(events)
                    message = f"{title}: {event.name}"
                else:
                    message = fake.sentence()

                Notification.objects.create(
                    user=student,
                    title=title,
                    message=message,
                    is_read=random.random() > 0.3,  # 70% read
                )
