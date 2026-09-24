from .db import engine
from .models import Base, Election, Position, Candidate
from .db import SessionLocal
import datetime

Base.metadata.create_all(bind=engine)

session = SessionLocal()

def seed():
    # create a sample election
    e = Election(name='SUG General Election 2027', description='General election', start_time=datetime.datetime.utcnow(), end_time=None, status='open')
    session.add(e)
    session.commit()
    session.refresh(e)
    p1 = Position(election_id=e.id, name='President', max_selections=1)
    p2 = Position(election_id=e.id, name='Vice President', max_selections=1)
    session.add_all([p1,p2])
    session.commit()
    session.refresh(p1)
    session.refresh(p2)
    c1 = Candidate(election_id=e.id, position_id=p1.id, name='Candidate A', manifesto='Manifesto A')
    c2 = Candidate(election_id=e.id, position_id=p1.id, name='Candidate B', manifesto='Manifesto B')
    c3 = Candidate(election_id=e.id, position_id=p2.id, name='Candidate X', manifesto='Manifesto X')
    session.add_all([c1,c2,c3])
    session.commit()

if __name__ == '__main__':
    seed()
    print('seeded')
